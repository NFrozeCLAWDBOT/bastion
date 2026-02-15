import { FaLinkedin, FaGithub } from "react-icons/fa";

export function Footer() {
  return (
    <footer className="w-full py-6 flex justify-center items-center gap-4">
      <a
        href="https://www.linkedin.com/in/nfroze/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-smoke-grey hover:text-ash-white transition-colors duration-200"
        aria-label="LinkedIn"
      >
        <FaLinkedin className="h-5 w-5" />
      </a>
      <a
        href="https://github.com/nfroze"
        target="_blank"
        rel="noopener noreferrer"
        className="text-smoke-grey hover:text-ash-white transition-colors duration-200"
        aria-label="GitHub"
      >
        <FaGithub className="h-5 w-5" />
      </a>
    </footer>
  );
}
