import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const Loading = () => {
  return (
    <div>
      <h1 className="m-4 mb-8 text-center">
        <Skeleton width={200} height={40} />
      </h1>
      <p className="gap-4">
        <Skeleton count={9} height={60} width="100%" />
      </p>
    </div>
  );
};

export default Loading;
