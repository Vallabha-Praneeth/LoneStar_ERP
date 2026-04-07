import Lottie from "lottie-react";
import chartsAnimation from "@/assets/lottie/charts.json";

export function LottieChartsIcon() {
  return <Lottie animationData={chartsAnimation} loop={true} />;
}
