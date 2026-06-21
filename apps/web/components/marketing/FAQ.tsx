"use client";

import { useState } from "react";
import { Reveal } from "@/components/marketing/Reveal";
import { FAQS } from "@/lib/marketing/data";

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
  delay,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  delay: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <button
          className="flex w-full items-center justify-between py-5 text-left"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <span className="font-display text-lg text-cream pr-4">
            {question}
          </span>
          <span
            className="flex-shrink-0 font-mono-tape text-xl text-muted transition-transform duration-300"
            style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >
            +
          </span>
        </button>

        <div
          className="overflow-hidden transition-all duration-300"
          style={{
            maxHeight: isOpen ? "400px" : "0px",
            opacity: isOpen ? 1 : 0,
            transition:
              "max-height 0.35s cubic-bezier(0.2,0.7,0.2,1), opacity 0.3s ease",
          }}
        >
          <p className="max-w-prose pb-6 text-secondary leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </Reveal>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const handleToggle = (i: number) => {
    setOpenIndex(openIndex === i ? -1 : i);
  };

  return (
    <section id="faq" className="relative mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <p className="font-mono-tape text-xs uppercase tracking-widest text-muted">
          // questions
        </p>
        <h2 className="mt-3 font-display text-[clamp(2rem,5vw,3.4rem)] font-semibold tracking-tightest text-cream">
          Good questions.
        </h2>
      </Reveal>

      <div className="mt-12 max-w-3xl">
        {FAQS.map((faq, i) => (
          <AccordionItem
            key={i}
            question={faq.q}
            answer={faq.a}
            isOpen={openIndex === i}
            onToggle={() => handleToggle(i)}
            delay={i * 60}
          />
        ))}
      </div>

      <Reveal delay={FAQS.length * 60}>
        <p className="mt-10 font-mono-tape text-xs text-muted max-w-prose">
          lofi.sol is a creative tool, not an investment platform. Rewards are
          never guaranteed.
        </p>
      </Reveal>
    </section>
  );
}
