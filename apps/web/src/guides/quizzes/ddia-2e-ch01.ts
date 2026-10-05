import type { QuizSet } from "./types";

/** Chapter 1: Trade-Offs in Data Systems Architecture. */
export const CH01: QuizSet[] = [
  {
    id: "ch01.intro",
    afterBlockId: "ch_tradeoffs.15",
    blockHash: "01db37f3",
    title: "Data-intensive applications",
    questions: [
      {
        id: "ch01.q01",
        kind: "choice",
        prompt: "When does the book call an application data-intensive?",
        options: [
          "When it needs a lot of CPU power for one huge computation",
          "When managing its data is one of the main challenges in building it",
          "When it has more than a million users",
          "When it uses more than one database",
        ],
        answer: 1,
        explain:
          "Data-intensive means the hard part is the data: storing lots of it, handling changes, staying consistent during failures, and staying available. One huge computation is compute-intensive.",
        source: "ch_tradeoffs.4",
      },
      {
        id: "ch01.q02",
        kind: "match",
        prompt: "Match each building block to its job.",
        pairs: [
          ["Database", "Store data so it can be found again later"],
          ["Cache", "Remember the result of an expensive operation"],
          ["Search index", "Find data by keyword or filter"],
          ["Stream processing", "Handle events as soon as they happen"],
          ["Batch processing", "Crunch a large pile of collected data now and then"],
        ],
        explain: "Most apps glue these five standard blocks together with application code.",
        source: "ch_tradeoffs.6",
      },
      {
        id: "ch01.q03",
        kind: "truefalse",
        prompt:
          "Backend application code usually remembers each user's earlier requests in its own memory.",
        answer: false,
        explain:
          "Backend code is usually stateless: after one request it forgets it. Anything that must last between requests goes to the client or to databases and other data infrastructure.",
        source: "ch_tradeoffs.15",
      },
    ],
  },
  {
    id: "ch01.analytics",
    afterBlockId: "sec_introduction_analytics.7",
    blockHash: "b116efd8",
    title: "Operational vs analytical",
    questions: [
      {
        id: "ch01.q04",
        kind: "choice",
        prompt:
          "Who writes reports about the business to help management decide (business intelligence)?",
        options: [
          "Backend engineers",
          "Data scientists",
          "Business analysts",
          "Site reliability engineers",
        ],
        answer: 2,
        explain:
          "Business analysts do BI reporting. Data scientists look for new insights and build data-driven features like recommendations.",
        source: "sec_introduction_analytics.2",
      },
      {
        id: "ch01.q05",
        kind: "truefalse",
        prompt: "Analytical systems usually change the data that operational systems created.",
        answer: false,
        explain:
          "Analytical systems hold a read-only copy of the operational data. They may build new derived datasets, but they don't change the original.",
        source: "sec_introduction_analytics.5",
      },
      {
        id: "ch01.q06",
        kind: "choice",
        prompt:
          "Whose job is it to connect operational and analytical systems and look after the data infrastructure?",
        options: [
          "Analytics engineers",
          "Data engineers",
          "Database administrators",
          "Business analysts",
        ],
        answer: 1,
        explain:
          "Data engineers integrate the two sides. Analytics engineers shape and transform data so analysts and data scientists can use it.",
        source: "sec_introduction_analytics.6",
      },
    ],
  },
  {
    id: "ch01.oltp",
    afterBlockId: "sec_introduction_oltp.10",
    blockHash: "9bd091a7",
    title: "OLTP and OLAP",
    questions: [
      {
        id: "ch01.q07",
        kind: "blank",
        prompt: "Looking up a small number of records by their key is called a ___.",
        options: ["point query", "full scan", "batch job", "data cube"],
        answer: 0,
        explain:
          "Point queries are the typical OLTP access pattern: find a few records by key, then read or update them.",
        source: "sec_introduction_oltp.3",
      },
      {
        id: "ch01.q08",
        kind: "choice",
        prompt: "“What was the total revenue of each of our stores in January?” is a typical…",
        options: [
          "OLTP query, because it is about sales",
          "OLAP query, because it scans many records and adds them up",
          "Point query, because it names a month",
          "Stream query, because sales keep coming in",
        ],
        answer: 1,
        explain:
          "It reads a huge number of sales records and returns one total per store. Scanning and adding up many rows is what OLAP is for.",
        source: "sec_introduction_oltp.5",
      },
      {
        id: "ch01.q09",
        kind: "truefalse",
        prompt: "OLTP systems usually let end users write and run their own SQL queries.",
        answer: false,
        explain:
          "Free-form queries could read data users shouldn't see and could slow the database for everyone. OLTP apps run a fixed set of queries built into the code; analytical databases are the ones that allow free SQL.",
        source: "sec_introduction_oltp.9",
      },
    ],
  },
  {
    id: "ch01.dwh",
    afterBlockId: "id6.3",
    blockHash: "007e6c68",
    title: "Warehouses and lakes",
    questions: [
      {
        id: "ch01.q10",
        kind: "order",
        prompt: "Put the steps of getting data into a data warehouse in order.",
        items: [
          "Extract data from the operational databases",
          "Transform it into an analysis-friendly shape",
          "Load it into the data warehouse",
          "Analysts query the warehouse",
        ],
        explain:
          "That's ETL: extract, transform, load. If the transform happens inside the warehouse after loading, it is called ELT.",
        source: "sec_introduction_dwh.6",
      },
      {
        id: "ch01.q11",
        kind: "choice",
        prompt: "Which of these is NOT a reason to keep analysts off the OLTP databases?",
        options: [
          "The data is spread across many separate systems",
          "Big analytical queries would slow the app for other users",
          "OLTP schemas are better suited to analytics than warehouse schemas",
          "OLTP systems may sit on a network analysts can't access",
        ],
        answer: 2,
        explain:
          "It's the other way around: layouts that suit OLTP are poorly suited to analytics. The other three are real reasons from the book.",
        source: "sec_introduction_dwh.3",
      },
      {
        id: "ch01.q12",
        kind: "choice",
        prompt: "What mainly makes a data lake different from a data warehouse?",
        options: [
          "A data lake only holds data from a single application",
          "A data lake stores plain files of any kind, with no fixed schema",
          "A data lake can only be queried with SQL",
          "A data lake is always more expensive",
        ],
        answer: 1,
        explain:
          "A lake holds raw files (records, text, images, feature vectors…) without forcing one data model. That suits data scientists, and it's usually cheaper because it can sit on object storage.",
        source: "id5.4",
      },
      {
        id: "ch01.q13",
        kind: "blank",
        prompt:
          "Sending the results of analytical systems, like a trained ML model, back into operational systems is called ___.",
        options: ["ELT", "reverse ETL", "HTAP", "a data silo"],
        answer: 1,
        explain:
          "Reverse ETL: for example, a recommendation model trained on analytics data is deployed to serve users.",
        source: "id6.3",
      },
    ],
  },
  {
    id: "ch01.derived",
    afterBlockId: "sec_introduction_derived.7",
    blockHash: "994a3fd1",
    title: "Systems of record",
    questions: [
      {
        id: "ch01.q14",
        kind: "choice",
        prompt: "A cache and the system of record disagree about a value. Which one is right?",
        options: [
          "The cache, because it was read more recently",
          "Whichever was updated last",
          "The system of record, by definition",
          "Neither; you have to ask the user",
        ],
        answer: 2,
        explain:
          "The system of record (source of truth) holds the official version. Derived data like a cache can be thrown away and rebuilt from it.",
        source: "sec_introduction_derived.1",
      },
      {
        id: "ch01.q15",
        kind: "truefalse",
        prompt:
          "Whether a database is a system of record depends on which database product you pick.",
        answer: false,
        explain:
          "A database is just a tool. It's a system of record or a derived system depending on how your application uses it.",
        source: "sec_introduction_derived.4",
      },
      {
        id: "ch01.q16",
        kind: "choice",
        prompt: "Which of these is NOT derived data?",
        options: [
          "A cache in front of the database",
          "A search index",
          "The database where user input is first written",
          "A machine learning model trained on your data",
        ],
        answer: 2,
        explain:
          "Where new data is first written is the system of record. Caches, indexes, materialized views, and trained models are all derived.",
        source: "sec_introduction_derived.1",
      },
    ],
  },
  {
    id: "ch01.cloud",
    afterBlockId: "sec_introduction_cloud.6",
    blockHash: "99146ce4",
    title: "Build or buy",
    questions: [
      {
        id: "ch01.q17",
        kind: "choice",
        prompt: "What is the common rule of thumb for building in-house versus buying?",
        options: [
          "Always build, so you keep control",
          "Always buy, because it is cheaper",
          "Build what gives you a competitive edge; buy what is routine",
          "Build only what open source doesn't offer",
        ],
        answer: 2,
        explain:
          "Core competencies and competitive advantages stay in-house; routine, commonplace things go to a vendor. Most companies don't make their own CPUs.",
        source: "sec_introduction_cloud.2",
      },
      {
        id: "ch01.q18",
        kind: "blank",
        prompt: "Downloading MySQL and running it on a VM you control is ___ software.",
        options: ["SaaS", "self-hosted", "serverless", "bespoke"],
        answer: 1,
        explain:
          "It's off-the-shelf software you deploy and run yourself, the middle of the spectrum between bespoke software and a fully managed service.",
        source: "sec_introduction_cloud.5",
      },
    ],
  },
  {
    id: "ch01.cloudtradeoffs",
    afterBlockId: "sec_introduction_cloud_tradeoffs.9",
    blockHash: "e73aa156",
    title: "Cloud trade-offs",
    questions: [
      {
        id: "ch01.q19",
        kind: "choice",
        prompt: "When is running your own machines often cheaper than a cloud service?",
        options: [
          "When you already know how to run the system and your load is predictable",
          "When your load changes a lot from hour to hour",
          "When you have never run this kind of system before",
          "When your dataset is huge and queried in bursts",
        ],
        answer: 0,
        explain:
          "Experience plus steady load means you can buy the right machines once. Spiky load and new systems favor the cloud.",
        source: "sec_introduction_cloud_tradeoffs.2",
      },
      {
        id: "ch01.q20",
        kind: "truefalse",
        prompt:
          "Cloud services are especially valuable when the load on your system varies a lot over time.",
        answer: true,
        explain:
          "Machines sized for the peak sit idle most of the time. The cloud lets you scale up for the peak and give resources back afterwards.",
        source: "sec_introduction_cloud_tradeoffs.5",
      },
      {
        id: "ch01.q21",
        kind: "choice",
        prompt: "What does the book call the biggest downside of a cloud service?",
        options: [
          "It is always slower",
          "You have no control over it",
          "It cannot store large datasets",
          "It needs more operations staff",
        ],
        answer: 1,
        explain:
          "Missing features, outages, hard-to-debug problems, price changes: you can only wait or migrate. With no standard APIs, switching is costly (vendor lock-in).",
        source: "sec_introduction_cloud_tradeoffs.8",
      },
    ],
  },
  {
    id: "ch01.cloudnative",
    afterBlockId: "sec_introduction_storage_compute.6",
    blockHash: "e7dcfe3e",
    title: "Cloud native",
    questions: [
      {
        id: "ch01.q22",
        kind: "choice",
        prompt: "How do cloud native systems usually treat the local disk of a VM?",
        options: [
          "As the main, long-term home of the data",
          "As a short-lived cache that can disappear",
          "As a backup copy of object storage",
          "They never use it at all",
        ],
        answer: 1,
        explain:
          "If the VM fails or is swapped for a bigger one, its local disk is gone. So it's treated like an ephemeral cache, not lasting storage.",
        source: "sec_introduction_storage_compute.2",
      },
      {
        id: "ch01.q23",
        kind: "truefalse",
        prompt:
          "In cloud native systems, storage and computation are often split onto separate services.",
        answer: true,
        explain:
          "For example, S3 only stores files; to analyze them you run code somewhere else and pull the data over the network. This is called disaggregation.",
        source: "sec_introduction_storage_compute.5",
      },
      {
        id: "ch01.q24",
        kind: "blank",
        prompt: "Handling many customers' data on the same shared hardware is called ___.",
        options: ["RAID", "multitenancy", "replication", "orchestration"],
        answer: 1,
        explain:
          "Multitenancy uses hardware better and scales more easily, but needs care so one customer can't hurt another's speed or security.",
        source: "sec_introduction_storage_compute.6",
      },
    ],
  },
  {
    id: "ch01.operations",
    afterBlockId: "sec_introduction_operations.10",
    blockHash: "d7b464bc",
    title: "Operations",
    questions: [
      {
        id: "ch01.q25",
        kind: "blank",
        prompt: "With metered cloud billing, capacity planning turns into ___ planning.",
        options: ["disk", "financial", "release", "network"],
        answer: 1,
        explain:
          "You no longer buy disks ahead of time, but you still need to know what you use and why, or you waste money. Performance tuning becomes cost tuning.",
        source: "sec_introduction_operations.8",
      },
      {
        id: "ch01.q26",
        kind: "truefalse",
        prompt: "Moving to cloud services removes the need for operations work.",
        answer: false,
        explain:
          "The focus shifts to choosing and integrating services, security, monitoring, and costs. The book says the need for operations is as great as ever.",
        source: "sec_introduction_operations.10",
      },
    ],
  },
  {
    id: "ch01.distributed",
    afterBlockId: "sec_introduction_distributed.3",
    blockHash: "eee996b8",
    title: "Why distribute",
    questions: [
      {
        id: "ch01.q27",
        kind: "match",
        prompt: "Match each reason for using several machines to what it gives you.",
        pairs: [
          ["Fault tolerance", "Another machine takes over when one fails"],
          ["Scalability", "Spread work beyond what one machine can handle"],
          ["Latency", "Serve users from a server near them"],
          ["Elasticity", "Scale up and down so you pay only for what you use"],
        ],
        explain:
          "Each is a different reason to accept the extra complexity of a distributed system.",
        source: "sec_introduction_distributed.2",
      },
    ],
  },
  {
    id: "ch01.problems",
    afterBlockId: "sec_introduction_dist_sys_problems.5",
    blockHash: "bc32722f",
    title: "Distributed problems",
    questions: [
      {
        id: "ch01.q28",
        kind: "choice",
        prompt: "A request to another service times out. What do you actually know?",
        options: [
          "The service never received it",
          "The service received it and failed",
          "Nothing for sure: it may or may not have been received",
          "It is always safe to retry",
        ],
        answer: 2,
        explain:
          "A timeout tells you nothing about what happened on the other side, so blindly retrying might not be safe (it could run twice).",
        source: "sec_introduction_dist_sys_problems.1",
      },
      {
        id: "ch01.q29",
        kind: "truefalse",
        prompt: "Adding more nodes always makes data processing faster.",
        answer: false,
        explain:
          "Network calls are slow compared to local calls. Sometimes one simple single-threaded program beats a cluster with over 100 CPU cores.",
        source: "sec_introduction_dist_sys_problems.2",
      },
      {
        id: "ch01.q30",
        kind: "blank",
        prompt:
          "Collecting data about how a system runs, so you can find where problems are, is called ___.",
        options: ["elasticity", "observability", "normalization", "partitioning"],
        answer: 1,
        explain:
          "Observability, with tracing tools like OpenTelemetry, shows which service called which, and how long it took.",
        source: "sec_introduction_dist_sys_problems.3",
      },
    ],
  },
  {
    id: "ch01.microservices",
    afterBlockId: "sec_introduction_microservices.8",
    blockHash: "18af62c0",
    title: "Microservices",
    questions: [
      {
        id: "ch01.q31",
        kind: "choice",
        prompt: "According to the book, microservices are mainly a solution to…",
        options: [
          "A speed problem: they make apps faster",
          "A people problem: letting teams move without coordinating",
          "A storage problem: they hold more data",
          "A cost problem: they are cheaper to run",
        ],
        answer: 1,
        explain:
          "They let separate teams change their own service independently. In a small company with few teams they're often unnecessary overhead.",
        source: "sec_introduction_microservices.6",
      },
      {
        id: "ch01.q32",
        kind: "truefalse",
        prompt: "In a microservices setup, services commonly share one database.",
        answer: false,
        explain:
          "Each service usually has its own database. A shared database would make its structure part of every service's API and let one service's queries slow the others.",
        source: "sec_introduction_microservices.3",
      },
      {
        id: "ch01.q33",
        kind: "choice",
        prompt: "With serverless (FaaS), what do you pay for?",
        options: [
          "A fixed number of servers per month",
          "Only the time your code is actually running",
          "Nothing; it is free",
          "Each line of code you deploy",
        ],
        answer: 1,
        explain:
          "Metered billing for code: the provider starts and stops resources as requests come in.",
        source: "sec_introduction_microservices.7",
      },
    ],
  },
  {
    id: "ch01.hpc",
    afterBlockId: "id17.3",
    blockHash: "fc76317c",
    title: "Supercomputers",
    questions: [
      {
        id: "ch01.q34",
        kind: "choice",
        prompt: "When a node in a supercomputer job fails, what is a common response?",
        options: [
          "Keep serving users from the other nodes",
          "Stop the whole job, fix the node, restart from the last checkpoint",
          "Move the job to the cloud",
          "Ignore it; supercomputers have no failures",
        ],
        answer: 1,
        explain:
          "Big batch jobs save checkpoints, so stopping and restarting is fine. Cloud services can't stop like that because they must keep serving users.",
        source: "id17.2",
      },
    ],
  },
  {
    id: "ch01.law",
    afterBlockId: "sec_introduction_compliance.11",
    blockHash: "c3cdff40",
    title: "Law and society",
    questions: [
      {
        id: "ch01.q35",
        kind: "choice",
        prompt: "What does data minimization mean?",
        options: [
          "Compressing data so it takes less space",
          "Not storing data you don't really need, and deleting what's no longer needed",
          "Keeping only the newest version of each record",
          "Storing data in as few databases as possible",
        ],
        answer: 1,
        explain:
          "Once you count leak, legal, and safety risks, some data isn't worth keeping. This fits the GDPR's rule of collecting data only for a stated purpose.",
        source: "sec_introduction_compliance.9",
      },
      {
        id: "ch01.q36",
        kind: "truefalse",
        prompt: "The GDPR lists the specific technologies you must use to comply.",
        answer: false,
        explain:
          "It sets high-level principles on purpose, because technology changes fast. How to comply is left to interpretation.",
        source: "sec_introduction_compliance.6",
      },
      {
        id: "ch01.q37",
        kind: "choice",
        prompt: "Why can the right to be forgotten (erasure on request) be hard to build?",
        options: [
          "Many systems use append-only logs and derived datasets that are hard to change",
          "Databases cannot delete rows",
          "It requires a supercomputer",
          "Users rarely ask for it",
        ],
        answer: 0,
        explain:
          "Deleting one record from an immutable log, or from data already used to train a model, raises new engineering problems.",
        source: "sec_introduction_compliance.5",
      },
    ],
  },
  {
    id: "ch01.check",
    afterBlockId: "id592.5",
    blockHash: "c9912f99",
    title: "Chapter check",
    questions: [
      {
        id: "ch01.c01",
        kind: "match",
        prompt: "Match each term to what it means.",
        pairs: [
          ["OLTP", "Many small, fast reads and writes by an app"],
          ["OLAP", "Few big queries that scan and add up many rows"],
          ["Data warehouse", "Separate read-only copy of company data for analysts"],
          ["Data lake", "Raw files of any kind, for data scientists"],
        ],
        explain: "These four ideas come back throughout the book.",
        source: "id592.2",
      },
      {
        id: "ch01.c02",
        kind: "choice",
        prompt: "You lose your search index. What can you do?",
        options: [
          "Nothing: the data is gone for good",
          "Rebuild it from the system of record",
          "Restore it from the cache",
          "Ask users to re-enter their data",
        ],
        answer: 1,
        explain: "A search index is derived data, so it can be rebuilt from the source of truth.",
        source: "sec_introduction_derived.1",
      },
      {
        id: "ch01.c03",
        kind: "truefalse",
        prompt:
          "The book advises making a system distributed early, before you need to, to be safe.",
        answer: false,
        explain:
          "It's the opposite: don't rush into distribution if one machine can do the job. Single nodes are simpler and often cheaper.",
        source: "id592.4",
      },
      {
        id: "ch01.c04",
        kind: "blank",
        prompt:
          "Not being able to switch providers because there is no standard API is called vendor ___.",
        options: ["drift", "lock-in", "lag", "sprawl"],
        answer: 1,
        explain:
          "Without compatible APIs, moving to another service is costly, so you're stuck with your vendor.",
        source: "sec_introduction_cloud_tradeoffs.8",
      },
      {
        id: "ch01.c05",
        kind: "order",
        prompt: "Order these from “you build and run it” to “a vendor builds and runs it”.",
        items: [
          "Bespoke software you write and run in-house",
          "Open source software you self-host",
          "A cloud service or SaaS product",
        ],
        explain: "That's the spectrum from Figure 1-2: who builds the software, and who runs it.",
        source: "sec_introduction_cloud.3",
      },
      {
        id: "ch01.c06",
        kind: "choice",
        prompt: "What is the main theme of Chapter 1?",
        options: [
          "There is one best database for every job",
          "Most design questions have several answers, each with pros and cons",
          "The cloud is always the right choice",
          "Distributed systems are always better",
        ],
        answer: 1,
        explain:
          "Trade-offs: learn to ask the right questions and weigh the options for your situation.",
        source: "id592.0",
      },
    ],
  },
];
