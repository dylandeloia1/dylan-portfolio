import { Fraunces, JetBrains_Mono } from "next/font/google";
import ContourHero from "../components/ContourHero";
import { FaInstagram, FaGithub, FaLinkedin } from "react-icons/fa6";

const serif = Fraunces({ subsets: ["latin"], weight: ["300", "400"] });
const mono = JetBrains_Mono({ subsets: ["latin"] });

export default function Home() {
  return (
    <main className="relative h-[100dvh] overflow-hidden text-[#ece9d8] sm:min-h-screen sm:h-auto sm:overflow-visible">
      <ContourHero />

      <section className="pointer-events-none relative z-10 flex h-full min-h-0 flex-col justify-between p-4 sm:min-h-screen sm:p-6 md:p-10">
        <header
          className={`${mono.className} flex justify-end text-xs uppercase tracking-[0.25em] text-[#ece9d8]/60`}
        >
          <span></span>
        </header>

        <div
          className={`${mono.className} pointer-events-auto mt-20 w-full max-w-2xl md:max-w-3xl lg:max-w-3xl text-s leading-relaxed text-[#ece9d8]/80 sm:mt-14 sm:text-base`}
        >
          <p className="mb-3 text-s uppercase tracking-[0.15em] text-[#ff6a1a] hidden sm:block">
            Building creative solutions that solve real problems.
          </p>

          <p className="text-lg sm:text-xl leading-relaxed text-[#ece9d8]">
            I'm{" "}
            <span className="text-2xl text-[#ff6a1a] sm:text-[#fafaf8] font-bold tracking-tight sm:text-4xl">
              Dylan D'Eloia
            </span>
            <span className="hidden sm:inline">
              , a detail-oriented software engineer who enjoys turning complex
              problems into thoughtful and intuitive software.
            </span>
          </p>
          <div className="pointer-events-auto mt-2 flex flex-wrap gap-2 text-[9px] uppercase tracking-[0.08em] sm:mt-5 sm:gap-2.5 sm:text-xs sm:tracking-[0.1em]">
            {[
              "Python",
              "SQL",
              "C#",
              "VB.Net",
              "Java",
              "Javacript",
              "React.js",
              "Solution Architecture",
              "MATLAB ",
              "Logic and Algorithms",
              "Github",
              "AI Prompt Engineering",
              "CI/CD",
              "Golf",
            ].map((skill) => (
              <span
                key={skill}
                className="cursor-default border border-[#ece9d8]/30 px-2 py-1.5 text-[#ece9d8]/70 hover:border-[#ff6a1a] hover:text-[#ff6a1a] sm:px-2.5 transition-all duration-200 hover:scale-105"
              >
                {skill}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-[#ece9d8]/70 sm:mt-4 sm:text-base">
            <span className="block sm:inline">
              Click on the holes, or click anywhere
            </span>
            <span className="block sm:inline">
              {" "}
              and drag and release to make a putt!
            </span>
          </p>
        </div>

        <footer className="relative z-50">
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            <a
              href="https://github.com/dylandeloia1"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="pointer-events-auto inline-flex items-center justify-center p-2 text-[#ece9d8]/70 transition-all duration-200 hover:scale-110 hover:text-[#ff6a1a]"
            >
              <FaGithub size={23} />
            </a>

            <a
              href="https://www.linkedin.com/in/dylandeloia/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="pointer-events-auto inline-flex items-center justify-center p-2 text-[#ece9d8]/70 transition-all duration-200 hover:scale-110 hover:text-[#ff6a1a]"
            >
              <FaLinkedin size={23} />
            </a>

            <a
              href="https://www.instagram.com/__dylanbrian/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="pointer-events-auto inline-flex items-center justify-center p-2 text-[#ece9d8]/70 transition-all duration-200 hover:scale-110 hover:text-[#ff6a1a]"
            >
              <FaInstagram size={23} />
            </a>
          </div>
        </footer>
      </section>
    </main>
  );
}
