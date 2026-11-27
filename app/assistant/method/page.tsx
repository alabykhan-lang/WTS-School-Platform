import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How the assistant works out a figure",
  description: "The ranking, pass rate and missing-mark rules the Proprietor Assistant follows, so any figure can be checked.",
  robots: { index: false, follow: false },
};

const rules: { heading: string; body: string[] }[] = [
  {
    heading: "Pass and fail",
    body: [
      "A learner passes when their total out of 100 is at or above the school's pass mark. The mark comes from the school's own grade bands and is 40 by default.",
      "The total is CA1 + CA2 + CA3 (each out of 10, 30 together) plus the exam (out of 70). This is exactly how the Results Portal grades a report card.",
      "The pass mark is stated in every answer that gives a pass or fail figure. An exam-only rate is never mixed with a total-based rate.",
    ],
  },
  {
    heading: "Ranking",
    body: [
      "A learner's subject percentage is their recorded marks divided by the maximum for the parts that were recorded. With CA1 5 and CA2 5 recorded, that is 10 out of 20, so 50%.",
      "A learner's overall figure is the average of their subject percentages across the subjects analysed, highest first. It is shown to one decimal place.",
      "A learner joins the ranking as soon as one mark is recorded on the chosen basis in one subject. There is no need to wait for the exam.",
      "Learners level on the same figure share the position, and every one of them is listed. A top or weakest list never drops a tie.",
    ],
  },
  {
    heading: "A term that is still filling up",
    body: [
      "Recorded marks are never treated as a fault or as missing work. The answer uses what is on file and says how much of the exam is in.",
      "\"Current\" means every mark recorded so far. Naming a part (CA1, the test, the exam) narrows the basis to that part alone.",
      "A subject rate is counted against the learners with a mark on that basis, never the whole class, and the denominator is stated.",
    ],
  },
  {
    heading: "Checking a figure",
    body: [
      "Ask \"show me the source table\" and the assistant returns one row per learner and subject: the marks, the percentage, the total out of 100 and whether that learner passed.",
      "Every answer can also be printed or copied on its own from the buttons under it.",
    ],
  },
  {
    heading: "The classes",
    body: [
      "Crèche to Primary 5 are pupils. JSS1 to SS3 are students. Names are alphabetical in every list.",
    ],
  },
];

export default function AssistantMethodPage() {
  return <main className="assistantMethod">
    <p className="assistantEyebrow">PROPRIETOR ASSISTANT</p>
    <h1>How a figure is worked out</h1>
    <p className="assistantMethodLead">The same rules every time, so any number in an answer can be checked against the record.</p>
    {rules.map((rule) => <section key={rule.heading}>
      <h2>{rule.heading}</h2>
      {rule.body.map((line) => <p key={line}>{line}</p>)}
    </section>)}
    <p className="assistantMethodFoot"><Link href="/assistant">Back to the assistant</Link></p>
  </main>;
}
