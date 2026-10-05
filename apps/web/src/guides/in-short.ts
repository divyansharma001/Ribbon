/**
 * "In short" cards: Ribbon's own plain-English summary at the start of a
 * section, plus the key terms the section introduces. Written for Ribbon,
 * not taken from the book. Keyed by book, chapter, then section anchor.
 */

export interface InShort {
  text: string;
  terms: string[];
}

export const IN_SHORT: Record<string, Record<string, Record<string, InShort>>> = {
  "ddia-2e": {
    ch01: {
      ch_tradeoffs: {
        text: "This chapter is about choices. There is no perfect data system, only trade-offs: every option is good at some things and bad at others.",
        terms: ["data-intensive", "trade-off"],
      },
      sec_introduction_analytics: {
        text: "Companies use data in two ways. Operational systems run the app for users, like saving an order. Analytical systems help people study the data, like reports and trends.",
        terms: ["operational system", "analytical system"],
      },
      sec_introduction_oltp: {
        text: "OLTP is many small, fast reads and writes of a few rows, done by apps. OLAP is a few big queries that scan millions of rows to answer business questions.",
        terms: ["OLTP", "OLAP", "business intelligence"],
      },
      sec_introduction_dwh: {
        text: "Analysts don't query the live app databases. The data is copied into a separate data warehouse using ETL (extract, transform, load), so heavy reports never slow the app down.",
        terms: ["data warehouse", "ETL", "HTAP", "data lake"],
      },
      sec_introduction_derived: {
        text: "A system of record holds the true, original data. Derived data, like caches, search indexes, and warehouses, is a copy you can rebuild from it, kept to make reading faster.",
        terms: ["system of record", "derived data"],
      },
      sec_introduction_cloud: {
        text: "Build it or buy it? Run it yourself or let someone else run it? Self-hosting gives you control. A cloud service hands the hard day-to-day running to a provider.",
        terms: ["self-hosting", "cloud service", "SaaS"],
      },
      sec_introduction_cloud_tradeoffs: {
        text: "The cloud shines when you lack the skills to run something, or when your load goes up and down a lot. The cost is control: if the service lacks a feature or goes down, you can only wait.",
        terms: ["variable load", "vendor lock-in"],
      },
      sec_introduction_cloud_native: {
        text: "Cloud native systems are built from cloud parts like object storage (for example Amazon S3) instead of plain disks. That lets storage and computing grow separately.",
        terms: ["cloud native", "object storage", "storage and compute", "multitenancy"],
      },
      sec_introduction_operations: {
        text: "Running systems is still real work in the cloud era, it just changes: less looking after single machines, more automation, choosing services, and watching costs.",
        terms: ["operations", "DevOps", "SRE"],
      },
      sec_introduction_distributed: {
        text: "A distributed system is many machines working together over a network. You need one when users are far apart, data is too big for one machine, or the system must survive a machine failing.",
        terms: ["distributed system", "node", "elasticity"],
      },
      sec_introduction_dist_sys_problems: {
        text: "Networks are slow and unreliable compared to one machine: calls can fail or time out, and problems are hard to trace. If one machine is enough, keep it simple.",
        terms: ["network failure", "observability"],
      },
      sec_introduction_microservices: {
        text: "Microservices split an app into small services owned by separate teams, so each team can move on its own, at the cost of more moving parts. Serverless lets the cloud run your code and bill you per use.",
        terms: ["microservices", "serverless", "FaaS"],
      },
      id17: {
        text: "Supercomputers (HPC) work on huge science problems. If one part fails, the job usually stops and restarts from a saved checkpoint. Cloud services are built to keep running instead.",
        terms: ["HPC", "checkpoint"],
      },
      sec_introduction_compliance: {
        text: "Data about people comes with duties. Laws like the GDPR give people rights over their data, and sometimes the safest choice is not to store the data at all.",
        terms: ["GDPR", "data minimization"],
      },
    },
  },
};

export function inShortFor(bookId: string, chapterId: string): Record<string, InShort> {
  return IN_SHORT[bookId]?.[chapterId] ?? {};
}
