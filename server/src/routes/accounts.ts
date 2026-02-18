import { Router, Response } from "express";
import { pool } from "../db";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";
import { YAPILY_CONFIG, yapilyAuthHeaders } from "../config/yapily";

const router = Router();

// All routes require auth
router.use(verifyFirebaseToken);

/**
 * GET /api/accounts
 * Fetch all linked bank accounts for the authenticated user
 */
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      // Resolve user ID from DB
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid],
      );

      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const userId = userQuery.rows[0].id;

      const query = `
        SELECT
          a.id,
          a.name,
          a.account_type,
          a.currency_code,
          a.current_balance,
          a.masked_account_ref,
          i.name AS institution_name,
          a.last_synced_at
        FROM accounts a
        JOIN bank_connections bc ON a.bank_connection_id = bc.id
        JOIN institutions i ON bc.institution_id = i.id
        WHERE bc.user_id = $1
        ORDER BY i.name, a.name
      `;

      const result = await pool.query(query, [userId]);

      const accounts = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        accountType: row.account_type,
        currencyCode: row.currency_code,
        currentBalance: parseFloat(row.current_balance),
        maskedRef: row.masked_account_ref,
        institutionName: row.institution_name,
        lastSyncedAt: row.last_synced_at,
      }));

      res.json({ accounts });
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  },
);

/**
 * POST /api/accounts/connect
 * Start Open Banking connection flow with Yapily
 */
router.post(
  "/connect",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { institutionId } = req.body;
      if (!institutionId) {
        res.status(400).json({ error: "institutionId is required" });
        return;
      }

      // Resolve user ID
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid],
      );
      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      const userId = userQuery.rows[0].id;

      // Get institution
      const instRes = await pool.query(
        "SELECT id, name, provider_code FROM institutions WHERE id = $1",
        [institutionId],
      );
      if (instRes.rowCount === 0) {
        res.status(400).json({ error: "Invalid institution" });
        return;
      }
      const institution = instRes.rows[0];

      // Create consent with Yapily
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let yapilyResponse;
      try {
        yapilyResponse = await fetch(
          `${YAPILY_CONFIG.baseUrl}/account-auth-requests`,
          {
            method: "POST",
            headers: yapilyAuthHeaders(),
            body: JSON.stringify({
              applicationUserId: String(userId),
              institutionId: institution.provider_code,
              callback: `${
                process.env.CLIENT_URL || "http://localhost:5173"
              }/accounts?connected=true`,
            }),
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          console.error("Yapily API request timed out after 30 seconds");
          res.status(504).json({
            error: "Connection to Yapily timed out. Please try again.",
          });
        } else {
          console.error("Error connecting to Yapily:", fetchError);
          res.status(500).json({
            error:
              "Failed to connect to banking service. Please try again later.",
          });
        }
        return;
      }

      if (!yapilyResponse.ok) {
        const errorText = await yapilyResponse.text();
        console.error("Yapily consent creation failed:", errorText);
        res.status(500).json({ error: "Failed to initiate bank connection" });
        return;
      }

      const yapilyData = await yapilyResponse.json();
      const consentId = yapilyData.data?.id || yapilyData.id;
      const consentUrl =
        yapilyData.data?.authorisationUrl || yapilyData.authorisationUrl;

      // Store bank connection
      const connRes = await pool.query(
        `INSERT INTO bank_connections (user_id, institution_id, provider, external_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id`,
        [userId, institution.id, "yapily", consentId],
      );

      res.json({
        connectionId: connRes.rows[0].id,
        consentUrl,
        institutionName: institution.name,
      });
    } catch (error) {
      console.error("Error starting bank connection:", error);
      res.status(500).json({ error: "Failed to start bank connection" });
    }
  },
);

/**
 * POST /api/accounts/sync/:connectionId
 * Sync accounts from Yapily into database
 */
router.post(
  "/sync/:connectionId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { connectionId } = req.params;
      const { consentToken } = req.body;

      if (!consentToken) {
        res.status(400).json({ error: "consentToken is required" });
        return;
      }

      // Resolve user ID
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid],
      );
      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      const userId = userQuery.rows[0].id;

      // Get connection
      const connRes = await pool.query(
        "SELECT id, external_id, user_id FROM bank_connections WHERE id = $1",
        [connectionId],
      );
      if (connRes.rowCount === 0) {
        res.status(404).json({ error: "Connection not found" });
        return;
      }
      const connection = connRes.rows[0];

      // Verify ownership
      if (connection.user_id !== userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Fetch accounts from Yapily using the consent token
      console.log("🔄 Fetching accounts from Yapily using consent token");
      const yapilyResponse = await fetch(`${YAPILY_CONFIG.baseUrl}/accounts`, {
        method: "GET",
        headers: {
          ...yapilyAuthHeaders(),
          consent: consentToken,
        },
      });

      if (!yapilyResponse.ok) {
        const errorText = await yapilyResponse.text();
        console.error("❌ Yapily accounts fetch failed!");
        console.error(
          "Status:",
          yapilyResponse.status,
          yapilyResponse.statusText,
        );
        console.error("Error response:", errorText);
        console.error("Request URL:", `${YAPILY_CONFIG.baseUrl}/accounts`);
        res
          .status(500)
          .json({ error: "Failed to fetch accounts from provider" });
        return;
      }

      const yapilyData = await yapilyResponse.json();
      const yapilyAccounts = yapilyData.data || [];

      // Insert or update each account
      for (const ya of yapilyAccounts) {
        await pool.query(
          `INSERT INTO accounts (
             bank_connection_id, household_id, external_account_id, name,
             account_type, currency_code, masked_account_ref,
             current_balance, available_balance, last_synced_at
           )
           VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, now())
           ON CONFLICT (bank_connection_id, external_account_id)
           DO UPDATE SET
             name = EXCLUDED.name,
             account_type = EXCLUDED.account_type,
             currency_code = EXCLUDED.currency_code,
             masked_account_ref = EXCLUDED.masked_account_ref,
             current_balance = EXCLUDED.current_balance,
             available_balance = EXCLUDED.available_balance,
             last_synced_at = now()`,
          [
            connection.id,
            ya.id,
            ya.nickname || ya.accountNames?.[0]?.name || "Account",
            ya.accountType || "current",
            ya.currency,
            ya.accountIdentifications?.[0]?.identification || null,
            ya.balance?.current?.amount || 0,
            ya.balance?.available?.amount || 0,
          ],
        );
      }

      res.json({ ok: true, accountCount: yapilyAccounts.length });
    } catch (error) {
      console.error("Error syncing accounts:", error);
      res.status(500).json({ error: "Failed to sync accounts" });
    }
  },
);

/**
 * POST /api/accounts/manual
 * Create a manual account (not connected to Open Banking)
 */
router.post(
  "/manual",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { name, accountType, currencyCode, startingBalance, maskedRef } =
        req.body;

      // Validate required fields
      if (!name || !accountType || !currencyCode) {
        res
          .status(400)
          .json({ error: "name, accountType, and currencyCode are required" });
        return;
      }

      // Resolve user ID
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid],
      );
      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      const userId = userQuery.rows[0].id;

      // Ensure a "Manual Bank" institution exists
      const manualInstEntry = await pool.query(
        "SELECT id FROM institutions WHERE provider_code = 'manual_bank'",
      );

      let manualInstitutionId;
      if (manualInstEntry.rows.length === 0) {
        // Create it
        const createInst = await pool.query(
          `INSERT INTO institutions (name, country_code, provider_code)
           VALUES ('Manual Bank', 'GB', 'manual_bank')
           RETURNING id`,
        );
        manualInstitutionId = createInst.rows[0].id;
      } else {
        manualInstitutionId = manualInstEntry.rows[0].id;
      }

      // Create manual bank connection
      const connRes = await pool.query(
        `INSERT INTO bank_connections (user_id, institution_id, provider, external_id, status)
         VALUES ($1, $2, 'manual', gen_random_uuid()::text, 'active')
         RETURNING id`,
        [userId, manualInstitutionId],
      );
      const connectionId = connRes.rows[0].id;

      // Create account
      const balance = startingBalance || 0;
      const accountRes = await pool.query(
        `INSERT INTO accounts (
           bank_connection_id, household_id, external_account_id, name,
           account_type, currency_code, masked_account_ref,
           current_balance, available_balance, last_synced_at
         )
         VALUES ($1, NULL, gen_random_uuid()::text, $2, $3, $4, $5, $6, $7, now())
         RETURNING id`,
        [
          connectionId,
          name,
          accountType,
          currencyCode,
          maskedRef || null,
          balance,
          balance,
        ],
      );

      res.json({
        connection: { id: connectionId },
        account: {
          id: accountRes.rows[0].id,
          name,
          accountType,
          currencyCode,
          currentBalance: balance,
        },
      });
    } catch (error) {
      console.error("Error creating manual account:", error);
      res.status(500).json({ error: "Failed to create manual account" });
    }
  },
);

/**
 * POST /api/accounts/resync
 * Resync all connected accounts to fetch latest balances and transactions
 */
router.post(
  "/resync",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      // Resolve user ID
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid],
      );
      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      const userId = userQuery.rows[0].id;

      // Get all active Yapily connections
      const connectionsResult = await pool.query(
        `SELECT id, external_id 
         FROM bank_connections 
         WHERE user_id = $1 
         AND provider = 'yapily' 
         AND status = 'active'`,
        [userId],
      );

      if (connectionsResult.rows.length === 0) {
        res.json({
          ok: true,
          message: "No connected accounts to resync",
          accountsUpdated: 0,
        });
        return;
      }

      let totalAccountsUpdated = 0;
      const errors: string[] = [];

      // Resync each connection
      for (const connection of connectionsResult.rows) {
        try {
          console.log(
            `🔄 Resyncing connection ${connection.id} (${connection.external_id})`,
          );

          // First, fetch the consent details to get the fresh consentToken
          // connection.external_id is the Consent ID
          const consentResponse = await fetch(
            `${YAPILY_CONFIG.baseUrl}/consents/${connection.external_id}`,
            {
              method: "GET",
              headers: yapilyAuthHeaders(),
            },
          );

          if (!consentResponse.ok) {
            const errorText = await consentResponse.text();
            console.error(
              `❌ Failed to fetch consent for connection ${connection.id}:`,
              errorText,
            );
            errors.push(
              `Connection ${connection.id}: Failed to retrieve consent token (${consentResponse.statusText})`,
            );
            continue;
          }

          const consentData = await consentResponse.json();
          const consentToken = consentData.data?.consentToken;

          if (!consentToken) {
            console.error(
              `❌ No consent token found for connection ${connection.id}`,
            );
            errors.push(
              `Connection ${connection.id}: No consent token returned from Yapily`,
            );
            continue;
          }

          // Fetch accounts from Yapily using the fresh consentToken
          const yapilyResponse = await fetch(
            `${YAPILY_CONFIG.baseUrl}/accounts`,
            {
              method: "GET",
              headers: {
                ...yapilyAuthHeaders(),
                consent: consentToken,
              },
            },
          );

          if (!yapilyResponse.ok) {
            const errorText = await yapilyResponse.text();
            console.error(
              `❌ Failed to resync connection ${connection.id}:`,
              errorText,
            );
            errors.push(
              `Connection ${connection.id}: ${yapilyResponse.statusText}`,
            );
            continue;
          }

          const yapilyData = await yapilyResponse.json();
          const yapilyAccounts = yapilyData.data || [];

          // Update each account
          for (const ya of yapilyAccounts) {
            const externalAccountId = ya.id;
            const accountName =
              ya.nickname || ya.accountNames?.[0]?.name || "Account";
            const accountType = ya.accountType || "current";
            const currencyCode = ya.currency;
            const maskedAccountRef =
              ya.accountIdentifications?.[0]?.identification || null;
            const currentBalance = ya.balance?.current?.amount || 0;
            const availableBalance = ya.balance?.available?.amount || 0;

            // Check if account already exists
            const existingAccount = await pool.query(
              `SELECT id FROM accounts 
               WHERE bank_connection_id = $1 AND external_account_id = $2`,
              [connection.id, externalAccountId],
            );

            if (existingAccount.rows.length > 0) {
              // Update existing account
              await pool.query(
                `UPDATE accounts SET
                   name = $1,
                   account_type = $2,
                   currency_code = $3,
                   masked_account_ref = $4,
                   current_balance = $5,
                   available_balance = $6,
                   last_synced_at = now()
                 WHERE id = $7`,
                [
                  accountName,
                  accountType,
                  currencyCode,
                  maskedAccountRef,
                  currentBalance,
                  availableBalance,
                  existingAccount.rows[0].id,
                ],
              );
            } else {
              // Insert new account
              await pool.query(
                `INSERT INTO accounts (
                   bank_connection_id, household_id, external_account_id, name,
                   account_type, currency_code, masked_account_ref,
                   current_balance, available_balance, last_synced_at
                 )
                 VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, now())`,
                [
                  connection.id,
                  externalAccountId,
                  accountName,
                  accountType,
                  currencyCode,
                  maskedAccountRef,
                  currentBalance,
                  availableBalance,
                ],
              );
            }

            totalAccountsUpdated++;

            // Fetch transactions for this account
            try {
              // Try to trigger enrichment for the transactions
              // Note: This may not be available in sandbox environments
              console.log(
                `Attempting to trigger enrichment for account ${externalAccountId}...`,
              );

              try {
                const enrichmentResponse = await fetch(
                  `${YAPILY_CONFIG.baseUrl}/accounts/${externalAccountId}/transactions/enrichment`,
                  {
                    method: "POST",
                    headers: {
                      ...yapilyAuthHeaders(),
                      consent: consentToken,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      countryCode: "GB",
                      categorisationType: "consumer",
                    }),
                  },
                );

                if (enrichmentResponse.ok) {
                  console.log(
                    `✅ Enrichment triggered for account ${externalAccountId}`,
                  );
                } else {
                  console.log(
                    `ℹ️ Enrichment not available (${enrichmentResponse.status}). Transactions may already include enrichment data if categorisation scope is enabled.`,
                  );
                }
              } catch {
                console.log(
                  `ℹ️ Enrichment endpoint not available. Continuing with transaction fetch...`,
                );
              }

              // Now fetch the transactions
              const transactionsResponse = await fetch(
                `${YAPILY_CONFIG.baseUrl}/accounts/${externalAccountId}/transactions`,
                {
                  method: "GET",
                  headers: {
                    ...yapilyAuthHeaders(),
                    consent: consentToken,
                  },
                },
              );

              if (transactionsResponse.ok) {
                const transactionsData = await transactionsResponse.json();
                const transactions = transactionsData.data || [];

                console.log(
                  `Fetched ${transactions.length} transactions for account ${externalAccountId}`,
                );

                // Log if enrichment data is present
                const enrichedCount = transactions.filter(
                  (tx: Record<string, unknown>) => tx.enrichment,
                ).length;
                console.log(
                  `  ${enrichedCount}/${transactions.length} transactions have enrichment data`,
                );

                // Debug: Log first enriched transaction structure
                const firstEnriched = transactions.find(
                  (tx: Record<string, unknown>) => tx.enrichment,
                );
                if (firstEnriched) {
                  console.log(
                    "📊 Sample enrichment data:",
                    JSON.stringify(firstEnriched.enrichment, null, 2),
                  );
                }

                for (const tx of transactions) {
                  const externalTransactionId = tx.id;
                  const postedAt =
                    tx.bookingDateTime || tx.date || new Date().toISOString();
                  const description =
                    tx.description ||
                    tx.transactionInformation ||
                    "Transaction";

                  // Extract merchant name from enrichment data (Yapily categorization)
                  // This comes from the enrichment.merchant field if categorization is enabled
                  const merchantName =
                    tx.enrichment?.merchant?.merchantName ||
                    tx.merchant?.merchantName ||
                    null;

                  // Extract category from enrichment data
                  const categoryName =
                    tx.enrichment?.categorisation?.category || null;

                  // Debug logging for first transaction
                  if (tx === transactions[0]) {
                    console.log("🔍 First transaction enrichment debug:");
                    console.log("  - Has enrichment:", !!tx.enrichment);
                    console.log(
                      "  - Merchant path 1:",
                      tx.enrichment?.merchant?.merchantName,
                    );
                    console.log(
                      "  - Merchant path 2:",
                      tx.merchant?.merchantName,
                    );
                    console.log("  - Category:", categoryName);
                    console.log("  - Final merchant:", merchantName);
                  }

                  const status = tx.status || "BOOKED";

                  // Handle amount and direction
                  let rawAmount = 0;
                  let currency = "GBP";

                  if (tx.transactionAmount) {
                    rawAmount = tx.transactionAmount.amount;
                    currency = tx.transactionAmount.currency;
                  } else if (tx.amount) {
                    rawAmount = tx.amount;
                  }

                  const direction = rawAmount < 0 ? "debit" : "credit";
                  const absAmount = Math.abs(rawAmount);

                  // Look up category ID from the Yapily category name
                  let categoryId = null;
                  if (categoryName) {
                    const categoryResult = await pool.query(
                      `SELECT id FROM categories WHERE name = $1`,
                      [categoryName],
                    );
                    if (categoryResult.rows.length > 0) {
                      categoryId = categoryResult.rows[0].id;
                    }
                  }

                  // Upsert transaction
                  // Assuming 'transactions' table has (account_id, external_transaction_id) unique constraint
                  // If not, we might get duplicates, but we'll try to handle it like accounts if needed.
                  // For now, let's assume ON CONFLICT works or we do a check.
                  // Given the previous issue, let's do a check-and-update for safety.

                  const existingTx = await pool.query(
                    `SELECT id FROM transactions 
                     WHERE account_id = $1 AND external_transaction_id = $2`,
                    [
                      existingAccount.rows[0]?.id ||
                        (
                          await pool.query(
                            `SELECT id FROM accounts WHERE bank_connection_id = $1 AND external_account_id = $2`,
                            [connection.id, externalAccountId],
                          )
                        ).rows[0].id,
                      externalTransactionId,
                    ],
                  );

                  // Get the correct account ID (it might have been just inserted)
                  let accountId =
                    existingAccount.rows.length > 0
                      ? existingAccount.rows[0].id
                      : null;
                  if (!accountId) {
                    const newAccountParams = await pool.query(
                      `SELECT id FROM accounts WHERE bank_connection_id = $1 AND external_account_id = $2`,
                      [connection.id, externalAccountId],
                    );
                    accountId = newAccountParams.rows[0]?.id;
                  }

                  if (accountId) {
                    if (existingTx.rows.length > 0) {
                      await pool.query(
                        `UPDATE transactions SET
                             posted_at = $1,
                             amount = $2,
                             currency_code = $3,
                             direction = $4,
                             description = $5,
                             merchant_name = $6,
                             status = $7,
                             category_id = $8,
                             updated_at = now()
                           WHERE id = $9`,
                        [
                          postedAt,
                          absAmount,
                          currency,
                          direction,
                          description,
                          merchantName,
                          status,
                          categoryId,
                          existingTx.rows[0].id,
                        ],
                      );
                    } else {
                      await pool.query(
                        `INSERT INTO transactions (
                             account_id, external_transaction_id, posted_at, amount,
                             currency_code, direction, description, merchant_name,
                             status, category_id, created_at, updated_at
                           )
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())`,
                        [
                          accountId,
                          externalTransactionId,
                          postedAt,
                          absAmount,
                          currency,
                          direction,
                          description,
                          merchantName,
                          status,
                          categoryId,
                        ],
                      );
                    }
                  }
                }
              } else {
                console.error(
                  `Failed to fetch transactions for account ${externalAccountId}: ${transactionsResponse.statusText}`,
                );
              }
            } catch (txError) {
              console.error(
                `Error fetching transactions for account ${externalAccountId}:`,
                txError,
              );
            }
          }

          console.log(
            `✅ Resynced ${yapilyAccounts.length} accounts for connection ${connection.id}`,
          );
        } catch (error) {
          console.error(
            `❌ Error resyncing connection ${connection.id}:`,
            error,
          );
          errors.push(
            `Connection ${connection.id}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          );
        }
      }

      res.json({
        ok: true,
        accountsUpdated: totalAccountsUpdated,
        connectionsProcessed: connectionsResult.rows.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Error resyncing accounts:", error);
      res.status(500).json({ error: "Failed to resync accounts" });
    }
  },
);

/**
 * DELETE /api/accounts/:id
 * Delete a bank account and all associated transactions
 */
router.delete(
  "/:id",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      // Resolve user ID from DB
      const userQuery = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid],
      );

      if (userQuery.rows.length === 0) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const userId = userQuery.rows[0].id;
      const accountId = req.params.id;

      // Verify the account belongs to this user
      const accountCheck = await pool.query(
        `SELECT a.id 
         FROM accounts a
         JOIN bank_connections bc ON a.bank_connection_id = bc.id
         WHERE a.id = $1 AND bc.user_id = $2`,
        [accountId, userId],
      );

      if (accountCheck.rows.length === 0) {
        res.status(404).json({ error: "Account not found or unauthorized" });
        return;
      }

      // Delete all transactions for this account (if not using CASCADE)
      await pool.query("DELETE FROM transactions WHERE account_id = $1", [
        accountId,
      ]);

      // Delete the account
      await pool.query("DELETE FROM accounts WHERE id = $1", [accountId]);

      console.log(`✅ Deleted account ${accountId} and its transactions`);

      res.status(200).json({
        message: "Account deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting account:", err);
      res.status(500).json({ error: "Failed to delete account" });
    }
  },
);

export default router;
