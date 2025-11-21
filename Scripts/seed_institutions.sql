-- Seed institutions table with Yapily sandbox banks
INSERT INTO
    institutions (
        name,
        country_code,
        provider_code
    )
VALUES (
        'AIB UK Sandbox',
        'GB',
        'aibgb-sandbox'
    ),
    (
        'Modelo Sandbox',
        'GB',
        'modelo-sandbox'
    ) ON CONFLICT (provider_code) DO NOTHING;