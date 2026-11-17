import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Para Analya — DoomerPlace",
  robots: { index: false, follow: false },
};

export default function AnalyaPage() {
  return (
    <main className="ania-page">
      <p className="ania-heart" aria-hidden="true">
        ❤
      </p>
      <h1>Hola Analya soy Josh deberíamos casarnos</h1>
    </main>
  );
}
