import type { Metadata } from "next";
import CartaAnalya from "./carta";

export const metadata: Metadata = {
  title: "Para Analya — DoomerPlace",
  robots: { index: false, follow: false },
};

export default function AnalyaPage() {
  return <CartaAnalya />;
}
