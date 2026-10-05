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
    ch02: {
      ch_nonfunctional: {
        text: "Features say what an app does. Nonfunctional requirements say how well it does it: fast, reliable, able to grow, and easy to maintain. This chapter gives you words to describe each one.",
        terms: ["functional requirement", "nonfunctional requirement"],
      },
      sec_introduction_twitter: {
        text: "A running example: a social network like X, with 5,800 posts per second and users who each follow about 200 people. How do you show everyone their home timeline fast?",
        terms: ["home timeline"],
      },
      sec_introduction_materializing: {
        text: "Instead of building each timeline when it is read, deliver every new post into each follower's stored timeline when it is written. Reads get cheap, writes get costlier, and celebrities need special care.",
        terms: ["fan-out", "materialized view", "materialization"],
      },
      sec_introduction_percentiles: {
        text: "Two numbers describe performance: response time (how long one request takes) and throughput (how many requests per second). Near full capacity, requests queue up and response time shoots up.",
        terms: ["response time", "throughput", "metastable failure", "backpressure"],
      },
      id23: {
        text: "Response time is everything the user waits for. It includes network travel, time waiting in queues, and the service time when work actually happens. A few slow requests can hold up the rest.",
        terms: ["service time", "latency", "queueing delay", "head-of-line blocking"],
      },
      id24: {
        text: "Response times vary, so treat them as a spread, not one number. The median shows the typical wait. High percentiles like p99 show how bad the slowest requests are.",
        terms: ["median", "percentile", "p99", "tail latency"],
      },
      sec_introduction_slo_sla: {
        text: "When one page needs many backend calls, it waits for the slowest one, so rare slow calls become common slow pages. Targets for percentiles go into SLOs, and SLAs say what happens if they're missed.",
        terms: ["tail latency amplification", "SLO", "SLA"],
      },
      sec_introduction_reliability: {
        text: "Reliable means it keeps working correctly even when things go wrong. A fault is one part breaking. A failure is the whole system letting users down. The goal is to stop faults from turning into failures.",
        terms: ["reliability", "fault", "failure"],
      },
      id27: {
        text: "A fault-tolerant system keeps serving users while some parts are broken, up to a limit. Some teams even break things on purpose to prove the safety nets work.",
        terms: [
          "fault tolerance",
          "single point of failure",
          "fault injection",
          "chaos engineering",
        ],
      },
      sec_introduction_hardware_faults: {
        text: "Disks, memory, CPUs, and whole datacenters fail. With enough machines, something breaks every day, so failure becomes normal. Redundancy and spreading across zones keep the service up.",
        terms: ["redundancy", "availability zone", "rolling upgrade"],
      },
      id30: {
        text: "Software bugs are worse than hardware faults because every node runs the same code. One trigger, like a leap second, can take them all down at once.",
        terms: ["correlated faults", "cascading failure"],
      },
      id31: {
        text: "People cause most outages, often through config changes. Blaming them doesn't help. Good tools, quick rollback, and blameless postmortems do.",
        terms: ["human error", "blameless postmortem"],
      },
      sec_introduction_scalability: {
        text: "Scalability is how well a system copes with more load. It is not a yes-or-no label. Don't build for scale you don't have yet: keep things simple until growth shows you where the limits are.",
        terms: ["scalability", "premature optimization"],
      },
      id33: {
        text: "First measure your load: requests per second, reads vs writes, extreme cases. Then ask how much more hardware you need when the load doubles. Linear scalability is the dream.",
        terms: ["load", "linear scalability"],
      },
      sec_introduction_shared_nothing: {
        text: "To grow, buy a bigger machine (scale up) or add more machines (scale out). Shared-nothing machines each have their own CPU, RAM, and disks, and coordinate over the network.",
        terms: ["vertical scaling", "shared-memory", "shared-disk", "shared-nothing"],
      },
      id35: {
        text: "There is no one-size-fits-all scalable design. Expect to rethink it at every 10x of load. Split work into independent parts, and don't make things more complex than needed.",
        terms: ["order of magnitude", "autoscaling"],
      },
      sec_introduction_maintainability: {
        text: "Most of software's cost comes after launch: fixing, running, and changing it. Design so future engineers can keep it running, understand it, and change it.",
        terms: ["maintainability", "legacy system"],
      },
      id37: {
        text: "Make routine running easy: good monitoring, no dependence on one machine, clear docs, sensible defaults, and predictable behavior. Automate, but not blindly.",
        terms: ["operability", "observability"],
      },
      id38: {
        text: "Complexity slows everyone down and hides bugs. Good abstractions like SQL hide messy details behind a simple face, and many apps can reuse them.",
        terms: ["big ball of mud", "accidental complexity", "abstraction"],
      },
      sec_introduction_evolvability: {
        text: "Requirements always change. Simple, loosely coupled systems are easier to change, and being able to undo a change makes every change safer.",
        terms: ["evolvability", "irreversibility"],
      },
    },
  },
};

export function inShortFor(bookId: string, chapterId: string): Record<string, InShort> {
  return IN_SHORT[bookId]?.[chapterId] ?? {};
}
