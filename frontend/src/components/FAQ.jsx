// src/components/FAQ.jsx
import React from "react";

export default function FAQ() {
  const faqs = [
    {
      q: "How do I add money to my account?",
      a: "You can top up your balance using GCash or Maya. Upload proof of payment and wait for admin verification.",
    },
    {
      q: "When can I pick up my order?",
      a: "Orders must be picked up during your designated break time slot based on your grade level. Check the schedule section above.",
    },
    {
      q: "What if I miss my pickup time?",
      a: "Please coordinate with canteen staff. Unclaimed orders may be forfeited to prevent food waste.",
    },
    {
      q: "Can parents monitor my spending?",
      a: "Yes! Parents can view transaction history and set daily/weekly spending limits through their account.",
    },
  ];

  return (
    <section className="py-20 bg-gray-50" aria-labelledby="faq-heading">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-12">
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-700">Quick answers to common questions</p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 motion-reduce:transition-none"
            >
              <summary className="cursor-pointer font-semibold text-lg text-gray-900 list-none flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded">
                <span>{faq.q}</span>
                <svg
                  className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform motion-reduce:transition-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-700 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
