import { Fraunces, JetBrains_Mono } from "next/font/google";
import ContourHero from "../components/ContourHero";

const serif = Fraunces({ subsets: ["latin"], weight: ["300", "400"] });
const mono = JetBrains_Mono({ subsets: ["latin"] });

export default function Home() {
  return (
    
<main className="relative min-h-screen text-[#ece9d8]">
  <ContourHero />

  <section className="pointer-events-none relative z-10 flex min-h-screen flex-col justify-between p-6 md:p-10">
    <header
      className={`${mono.className} flex justify-end text-xs uppercase tracking-[0.25em] text-[#ece9d8]/60`}
    >
      <span></span>
    </header>

    <div>
      <p
        className={`${mono.className} mb-4 text-s uppercase tracking-[0.3em] text-[#ff6a1a]`}
        style={{
          textShadow: "0px 2px 4px rgba(0, 0, 0, 0.45)",
        }}
      >
        Software Engineer
      </p>

      <h1
        className={`${serif.className} text-7xl font-light leading-[0.95] md:text-8xl`}
        style={{
          textShadow: "0px 3px 6px rgba(0, 0, 0, 0.4)",
        }}
      >
        Dylan D&apos;Eloia
      </h1>

      <p
        className={`${mono.className} mt-6 max-w-md text-md leading-relaxed text-[#ece9d8]/70`}
        style={{
          textShadow: "0px 1px 4px rgba(0, 0, 0, 0.6)",
        }}
      >
        Click anywhere, drag and release to make a putt and explore! Change the difficulty using the slope rating.
      </p>
    </div>

    <footer
      className={`${mono.className} mb-4 text-xs text-center uppercase font-light tracking-[0.3em] text-[#ece9d8]/70`}
      style={{
        textShadow: "0px 2px 4px rgba(0, 0, 0, 0.6)",
      }}
    >
      ⬇ Scroll down to play through ⬇
    </footer>
  </section>
</main>
  );
}
