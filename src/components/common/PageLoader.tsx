import { GridLoader } from "react-spinners";

export default function PageLoader() {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center">
      <GridLoader color="#10b981" size={15} margin={2} speedMultiplier={1} />
    </div>
  );
}
