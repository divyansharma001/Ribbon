import type { QuizSet } from "./types";

/** Chapter 2: Defining Nonfunctional Requirements. */
export const CH02: QuizSet[] = [
  {
    id: "ch02.intro",
    afterBlockId: "ch_nonfunctional.6",
    blockHash: "8a0e4898",
    title: "Nonfunctional requirements",
    questions: [
      {
        id: "ch02.q01",
        kind: "match",
        prompt: "Sort each requirement into its kind.",
        pairs: [
          ["A 'Share' button on every post", "Functional"],
          ["Pages load in under a second", "Nonfunctional: performance"],
          ["Keeps working when a disk dies", "Nonfunctional: reliability"],
          ["New engineers can change it safely", "Nonfunctional: maintainability"],
        ],
        explain:
          "Functional requirements say what the app does: its screens, buttons, and operations. Nonfunctional ones say how well it does it: fast, reliable, scalable, easy to maintain.",
        source: "ch_nonfunctional.3",
      },
      {
        id: "ch02.q02",
        kind: "truefalse",
        prompt:
          "Nonfunctional requirements are optional extras: if the features work, the app has done its job.",
        answer: false,
        explain:
          "They are often not written down because they seem obvious, but they matter just as much. An app that is unbearably slow or unreliable might as well not exist.",
        source: "ch_nonfunctional.3",
      },
    ],
  },
  {
    id: "ch02.timeline",
    afterBlockId: "id20.7",
    blockHash: "79fe3516",
    title: "Home timelines by query",
    questions: [
      {
        id: "ch02.q03",
        kind: "choice",
        prompt: "What is a user's home timeline in the case study?",
        options: [
          "Every post the user has ever written",
          "Recent posts by the people the user follows",
          "The most popular posts on the whole network",
          "A list of the user's followers",
        ],
        answer: 1,
        explain:
          "The home timeline shows recent posts by the accounts you follow. It is the main read operation the social network must support.",
        source: "id20.3",
      },
      {
        id: "ch02.q04",
        kind: "blank",
        prompt:
          "Asking the server again and again whether anything is new, for example every five seconds, is called ___.",
        options: ["polling", "fan-out", "materializing", "sharding"],
        answer: 0,
        explain:
          "Polling means the client keeps repeating the query on a timer. With 10 million users online, that is 2 million timeline queries per second.",
        source: "id20.6",
      },
      {
        id: "ch02.q05",
        kind: "choice",
        prompt:
          "2 million timeline queries per second, each reading posts from 200 followed accounts. Roughly how many lookups per second is that?",
        options: ["2 million", "40 million", "400 million", "4 billion"],
        answer: 2,
        explain:
          "2,000,000 × 200 = 400 million lookups per second, and that is only the average case. Users who follow tens of thousands of accounts are far worse.",
        source: "id20.7",
      },
    ],
  },
  {
    id: "ch02.materializing",
    afterBlockId: "sec_introduction_materializing.8",
    blockHash: "227b759d",
    title: "Fan-out",
    questions: [
      {
        id: "ch02.q06",
        kind: "choice",
        prompt: "Instead of building the timeline on every read, what does the better design do?",
        options: [
          "Caches the SQL query text so it parses faster",
          "When someone posts, it writes the post into each follower's stored timeline",
          "Shows each user only posts from the last five seconds",
          "Asks followers to fetch the post directly from the sender's phone",
        ],
        answer: 1,
        explain:
          "Each user gets a precomputed home timeline, like a mailbox. A new post is delivered to every follower's mailbox, so reading is just handing over what is already there.",
        source: "sec_introduction_materializing.2",
      },
      {
        id: "ch02.q07",
        kind: "blank",
        prompt:
          "When one request causes many more requests downstream, the factor by which they multiply is called ___.",
        options: ["throughput", "fan-out", "latency", "jitter"],
        answer: 1,
        explain:
          "Fan-out describes how one request turns into many. A post from someone with 200 followers has a fan-out factor of 200.",
        source: "sec_introduction_materializing.3",
      },
      {
        id: "ch02.q08",
        kind: "truefalse",
        prompt:
          "A materialized view makes reads cheaper, but you pay for it with more work on every write.",
        answer: true,
        explain:
          "Precomputing the answer speeds up reads. The price is that every write must also update the stored results: about 1 million timeline writes per second at 5,800 posts per second.",
        source: "sec_introduction_materializing.7",
      },
      {
        id: "ch02.q09",
        kind: "choice",
        prompt:
          "How does the book suggest handling a post by a celebrity with millions of followers?",
        options: [
          "Drop some of the timeline writes, since nobody reads everything",
          "Write it into all the followers' timelines before showing it to anyone",
          "Store celebrity posts apart and merge them into the timeline when it is read",
          "Rate-limit celebrities to a few posts per day",
        ],
        answer: 2,
        explain:
          "Dropping writes is fine for someone who follows too many accounts, but not for a celebrity's followers. Instead, celebrity posts are kept apart and merged in at read time.",
        source: "sec_introduction_materializing.8",
      },
    ],
  },
  {
    id: "ch02.performance",
    afterBlockId: "sec_introduction_percentiles.8",
    blockHash: "73f2b647",
    title: "Throughput and response time",
    questions: [
      {
        id: "ch02.q10",
        kind: "choice",
        prompt: "Which of these is a response time metric, not a throughput metric?",
        options: [
          "Posts per second",
          "Timeline writes per second",
          "Time until a post shows up in followers' timelines",
          "Gigabytes of new data per day",
        ],
        answer: 2,
        explain:
          "Throughput counts how much work per second. Response time measures how long one request takes, from the user's point of view.",
        source: "sec_introduction_percentiles.3",
      },
      {
        id: "ch02.q11",
        kind: "choice",
        prompt: "Why does response time shoot up as throughput nears the hardware's maximum?",
        options: [
          "The CPU gets slower when it is hot",
          "Requests queue up waiting for earlier requests to finish",
          "The network starts dropping every other packet",
          "The database switches to a slower storage format",
        ],
        answer: 1,
        explain:
          "Queueing. When the machine is busy, a new request has to wait for earlier ones. Near capacity, those waits grow sharply.",
        source: "sec_introduction_percentiles.4",
      },
      {
        id: "ch02.q12",
        kind: "match",
        prompt: "Match each defense against overload to what it does.",
        pairs: [
          ["Exponential backoff", "Clients wait longer, at random, between retries"],
          ["Circuit breaker", "Stop calling a service that failed recently"],
          ["Load shedding", "The server rejects requests before it is overloaded"],
          ["Backpressure", "The server tells clients to slow down"],
        ],
        explain:
          "All four stop retries from piling up into a retry storm, which can leave a system stuck in overload: a metastable failure.",
        source: "sec_introduction_percentiles.6",
      },
      {
        id: "ch02.q13",
        kind: "truefalse",
        prompt: "Once the extra load goes away, an overloaded system always recovers on its own.",
        answer: false,
        explain:
          "Not always. Timeouts cause retries, which cause more load. Such a system can stay overloaded until it is rebooted or reset. This is called a metastable failure.",
        source: "sec_introduction_percentiles.6",
      },
    ],
  },
  {
    id: "ch02.latency",
    afterBlockId: "id23.6",
    blockHash: "40cd322f",
    title: "Latency and response time",
    questions: [
      {
        id: "ch02.q14",
        kind: "match",
        prompt: "Match each term to its meaning.",
        pairs: [
          ["Response time", "Everything the client waits for, start to end"],
          ["Service time", "Time the service is actively working on the request"],
          ["Queueing delay", "Time spent waiting for a free CPU or network"],
          ["Network latency", "Time the request and response spend travelling"],
        ],
        explain:
          "Response time is what the client sees and includes every delay. Latency is a catch-all for time when the request is not being worked on.",
        source: "id23.2",
      },
      {
        id: "ch02.q15",
        kind: "blank",
        prompt:
          "A few slow requests at the front of the line hold up fast requests behind them. This is called ___.",
        options: [
          "head-of-line blocking",
          "tail latency amplification",
          "fan-out",
          "a retry storm",
        ],
        answer: 0,
        explain:
          "A server can only work on a few things at once. Fast requests stuck behind slow ones still see a slow response time.",
        source: "id23.6",
      },
      {
        id: "ch02.q16",
        kind: "choice",
        prompt: "Why should you measure response time on the client side?",
        options: [
          "Clients have more accurate clocks",
          "The server only knows its service time, not the time requests spent waiting in queues",
          "It is cheaper than measuring on the server",
          "Servers are not allowed to log timings",
        ],
        answer: 1,
        explain:
          "Queueing delay is not part of the service time. Only the client sees the whole wait.",
        source: "id23.6",
      },
    ],
  },
  {
    id: "ch02.percentiles",
    afterBlockId: "id24.8",
    blockHash: "64abbd73",
    title: "Percentiles",
    questions: [
      {
        id: "ch02.q17",
        kind: "choice",
        prompt: "Your median response time is 200 ms. What does that tell you?",
        options: [
          "Every request takes about 200 ms",
          "Half the requests are faster than 200 ms and half are slower",
          "The average of all requests is 200 ms",
          "The slowest request took 200 ms",
        ],
        answer: 1,
        explain:
          "The median (p50) is the halfway point of the sorted list. It tells you how long a typical user waits.",
        source: "id24.4",
      },
      {
        id: "ch02.q18",
        kind: "truefalse",
        prompt: "The mean is the best number to describe a typical user's wait.",
        answer: false,
        explain:
          "A few huge outliers drag the mean up, and it doesn't tell you how many users actually saw that delay. The median is better for 'typical'. The mean is useful for estimating throughput limits.",
        source: "id24.3",
      },
      {
        id: "ch02.q19",
        kind: "blank",
        prompt: "If p95 is 1.5 seconds, then ___ out of 100 requests take 1.5 seconds or more.",
        options: ["95", "50", "5", "1"],
        answer: 2,
        explain: "95 out of 100 are faster than 1.5 s, so the slowest 5 take 1.5 s or longer.",
        source: "id24.5",
      },
      {
        id: "ch02.q20",
        kind: "choice",
        prompt:
          "Why does Amazon care about the 99.9th percentile, which hits only 1 in 1,000 requests?",
        options: [
          "Those slow requests often belong to the customers with the most data, who buy the most",
          "It is required by law",
          "It is the easiest percentile to improve",
          "Bots cause all of those slow requests",
        ],
        answer: 0,
        explain:
          "The slowest requests often come from customers with long purchase histories: the most valuable ones. Going further, to p99.99, was judged too costly for the benefit.",
        source: "id24.6",
      },
    ],
  },
  {
    id: "ch02.slo",
    afterBlockId: "sec_introduction_slo_sla.4",
    blockHash: "4d8b8407",
    title: "SLOs and SLAs",
    questions: [
      {
        id: "ch02.q21",
        kind: "choice",
        prompt:
          "One page needs 20 backend calls, made in parallel. Only 1 in 100 backend calls is slow. What happens?",
        options: [
          "Pages are slow 1 in 100 times, same as the calls",
          "Pages are slow much more often, because waiting for the slowest of 20 calls means more chances to hit a slow one",
          "Pages are never slow, because the calls run in parallel",
          "Pages are slow 1 in 2,000 times",
        ],
        answer: 1,
        explain:
          "The page waits for its slowest call. With 20 calls, about 18% of pages hit at least one slow call. This is tail latency amplification.",
        source: "sec_introduction_slo_sla.1",
      },
      {
        id: "ch02.q22",
        kind: "match",
        prompt: "Match each term to what it is.",
        pairs: [
          ["SLO", "A target, like p99 under 1 second"],
          ["SLA", "A contract saying what happens if the target is missed"],
          ["Tail latency", "The response times at high percentiles"],
        ],
        explain:
          "An SLO is the goal. An SLA is the agreement around it, for example a refund for customers when the SLO is not met.",
        source: "sec_introduction_slo_sla.3",
      },
      {
        id: "ch02.q23",
        kind: "truefalse",
        prompt: "To get the p99 across 10 servers, you can average each server's own p99.",
        answer: false,
        explain:
          "Averaging percentiles is mathematically meaningless. The right way is to add up the histograms and compute the percentile from the total.",
        source: "sec_introduction_slo_sla.4",
      },
    ],
  },
  {
    id: "ch02.faults",
    afterBlockId: "id27.5",
    blockHash: "3605319c",
    title: "Faults and failures",
    questions: [
      {
        id: "ch02.q24",
        kind: "choice",
        prompt: "What is the difference between a fault and a failure?",
        options: [
          "A fault is caused by hardware, a failure by software",
          "A fault is one part going wrong; a failure is the whole system no longer serving users",
          "A fault is permanent; a failure is temporary",
          "There is no difference",
        ],
        answer: 1,
        explain:
          "A fault is one component stopping, like a disk. A failure is the system as a whole not meeting its SLO. A good system stops faults from becoming failures.",
        source: "sec_introduction_reliability.4",
      },
      {
        id: "ch02.q25",
        kind: "blank",
        prompt: "A part whose fault brings down the whole system is called a single point of ___.",
        options: ["failure", "contention", "entry", "truth"],
        answer: 0,
        explain:
          "A single point of failure (SPOF) is a part the system cannot work without. Fault-tolerant design removes SPOFs.",
        source: "id27.1",
      },
      {
        id: "ch02.q26",
        kind: "truefalse",
        prompt: "A well-built fault-tolerant system can survive any number of faults at once.",
        answer: false,
        explain:
          "Fault tolerance always has limits, like 'up to two disks at once' or 'one of three nodes'. If every node dies, nothing can save you.",
        source: "id27.3",
      },
      {
        id: "ch02.q27",
        kind: "choice",
        prompt: "Why would a team deliberately kill random processes in production?",
        options: [
          "To save money on servers",
          "To keep the fault-handling code exercised, so it works when real faults happen",
          "To force users to upgrade",
          "To clear memory leaks",
        ],
        answer: 1,
        explain:
          "This is fault injection, used in chaos engineering. Many serious bugs live in rarely run error-handling code, so you test it on purpose.",
        source: "id27.4",
      },
    ],
  },
  {
    id: "ch02.hardware",
    afterBlockId: "id29.5",
    blockHash: "a39dc250",
    title: "Hardware faults",
    questions: [
      {
        id: "ch02.q28",
        kind: "choice",
        prompt:
          "About 2-5% of hard drives fail per year. In a cluster of 10,000 disks, how often should you expect a disk to fail?",
        options: [
          "About once a year",
          "About once a month",
          "About once a day",
          "About once a minute",
        ],
        answer: 2,
        explain:
          "10,000 × ~3.5% ≈ 350 a year, about one a day. At large scale, hardware faults are a normal part of running the system.",
        source: "sec_introduction_hardware_faults.2",
      },
      {
        id: "ch02.q29",
        kind: "truefalse",
        prompt: "Redundancy works best when faults are independent of each other.",
        answer: true,
        explain:
          "A backup only helps if it doesn't fail at the same time. In practice failures are often correlated: a whole rack or datacenter can go at once.",
        source: "id29.2",
      },
      {
        id: "ch02.q30",
        kind: "blank",
        prompt:
          "Patching a multi-node system by restarting one node at a time, with no downtime for users, is called a ___ upgrade.",
        options: ["rolling", "vertical", "blue", "cold"],
        answer: 0,
        explain:
          "A rolling upgrade is one of the operational benefits of tolerating the loss of whole machines. A single server needs planned downtime instead.",
        source: "id29.5",
      },
    ],
  },
  {
    id: "ch02.software",
    afterBlockId: "id30.4",
    blockHash: "372ad14d",
    title: "Software faults",
    questions: [
      {
        id: "ch02.q31",
        kind: "choice",
        prompt: "Why do software faults usually cause more failures than hardware faults?",
        options: [
          "Software is written faster than hardware is built",
          "Every node runs the same code with the same bugs, so they fail together",
          "Software faults cannot be fixed",
          "Hardware never fails in the cloud",
        ],
        answer: 1,
        explain:
          "Hardware faults are mostly independent. A software bug is on every node at once, so one trigger, like the 2012 leap second, can bring them all down.",
        source: "id30.1",
      },
      {
        id: "ch02.q32",
        kind: "choice",
        prompt:
          "A problem in one component overloads the next, which slows down and brings down another. What is this called?",
        options: ["A cascading failure", "A rolling upgrade", "Fan-out", "Load shedding"],
        answer: 0,
        explain:
          "In a cascading failure, trouble spreads from component to component, like dominoes.",
        source: "id30.2",
      },
      {
        id: "ch02.q33",
        kind: "truefalse",
        prompt:
          "Bugs like these often sleep for a long time, until an unusual situation breaks an assumption the code made about its environment.",
        answer: true,
        explain:
          "The assumption is usually true, which is why the bug stays hidden. There is no quick fix, only lots of small helps: testing, isolation, monitoring, and avoiding retry storms.",
        source: "id30.3",
      },
    ],
  },
  {
    id: "ch02.humans",
    afterBlockId: "id31.7",
    blockHash: "3f154c44",
    title: "Humans and reliability",
    questions: [
      {
        id: "ch02.q34",
        kind: "choice",
        prompt: "In one study of large internet services, what was the leading cause of outages?",
        options: [
          "Hardware faults",
          "Configuration changes by operators",
          "Attacks by hackers",
          "Power cuts",
        ],
        answer: 1,
        explain:
          "Config changes by operators came first. Hardware played a part in only 10-25% of cases.",
        source: "id31.1",
      },
      {
        id: "ch02.q35",
        kind: "truefalse",
        prompt:
          "When someone makes a mistake that causes an outage, the most useful fix is to blame them so others are more careful.",
        answer: false,
        explain:
          "'Human error' is a symptom of the system people work in, not the cause. Blameless postmortems let people share everything they know, so the organization can learn.",
        source: "id31.2",
      },
      {
        id: "ch02.q36",
        kind: "choice",
        prompt: "Which of these helps limit the damage from human mistakes?",
        options: [
          "Rollback mechanisms and gradual rollouts",
          "Longer rule books",
          "Fewer tests, so changes ship faster",
          "Letting only one person deploy",
        ],
        answer: 0,
        explain:
          "Quick rollback, gradual rollouts, good tests, monitoring, and interfaces that make 'the right thing' easy all reduce the impact of mistakes.",
        source: "id31.3",
      },
    ],
  },
  {
    id: "ch02.load",
    afterBlockId: "id33.6",
    blockHash: "966fdd69",
    title: "Scalability and load",
    questions: [
      {
        id: "ch02.q37",
        kind: "truefalse",
        prompt: 'It makes sense to say "Postgres is scalable" or "MongoDB doesn\'t scale".',
        answer: false,
        explain:
          "Scalability is not a one-word label. The real questions are: if load grows in a certain way, what are your options, and when will you hit your limits?",
        source: "sec_introduction_scalability.4",
      },
      {
        id: "ch02.q38",
        kind: "choice",
        prompt: "You are a small startup with a few hundred users. What should you focus on?",
        options: [
          "Designing for 100 million users from day one",
          "Keeping the system simple and easy to change",
          "Splitting everything into microservices",
          "Building your own datacenter",
        ],
        answer: 1,
        explain:
          "Planning for scale you may never need is premature optimization. Worse, it can lock you into a rigid design.",
        source: "sec_introduction_scalability.3",
      },
      {
        id: "ch02.q39",
        kind: "blank",
        prompt:
          "If doubling the resources lets you handle double the load at the same performance, you have ___ scalability.",
        options: ["linear", "vertical", "infinite", "elastic"],
        answer: 0,
        explain:
          "Linear scalability is the good case. More often, cost grows faster than the load.",
        source: "id33.6",
      },
    ],
  },
  {
    id: "ch02.architectures",
    afterBlockId: "id35.4",
    blockHash: "a8e57952",
    title: "Scaling up and out",
    questions: [
      {
        id: "ch02.q40",
        kind: "match",
        prompt: "Match each architecture to how it works.",
        pairs: [
          ["Shared-memory", "One big machine; threads share the same RAM"],
          ["Shared-disk", "Several machines share one array of disks"],
          ["Shared-nothing", "Each node has its own CPU, RAM, and disks"],
        ],
        explain:
          "Shared-memory is scaling up. Shared-nothing is scaling out. Shared-disk sits in between and is limited by locking and contention.",
        source: "sec_introduction_shared_nothing.4",
      },
      {
        id: "ch02.q41",
        kind: "choice",
        prompt: "Which is a downside of shared-nothing?",
        options: [
          "It can't use cheap hardware",
          "It can't survive a datacenter going down",
          "You must shard the data and deal with all the complexity of distributed systems",
          "It can never scale linearly",
        ],
        answer: 2,
        explain:
          "Shared-nothing can scale linearly, use any hardware, and survive datacenter loss. The price is sharding and the hard problems of distributed systems.",
        source: "sec_introduction_shared_nothing.5",
      },
      {
        id: "ch02.q42",
        kind: "truefalse",
        prompt:
          "A well-designed architecture should handle 10 times today's load without major changes.",
        answer: false,
        explain:
          "An architecture that fits one level of load rarely copes with 10 times that. Expect to rethink it at every order of magnitude, and don't plan much further ahead.",
        source: "id35.2",
      },
      {
        id: "ch02.q43",
        kind: "choice",
        prompt: "Which is one of the book's good general principles for scalability?",
        options: [
          "Use autoscaling everywhere",
          "Break the system into parts that can run largely independently",
          "Always start with 50 services",
          "Pick the one architecture known to scale for everything",
        ],
        answer: 1,
        explain:
          "Independent parts are the idea behind sharding, microservices, and shared-nothing. Also: don't make things more complicated than needed. There is no 'magic scaling sauce'.",
        source: "id35.3",
      },
    ],
  },
  {
    id: "ch02.operability",
    afterBlockId: "id37.5",
    blockHash: "0cd1e9bd",
    title: "Maintainability and operability",
    questions: [
      {
        id: "ch02.q44",
        kind: "truefalse",
        prompt: "Most of the cost of software comes from building it the first time.",
        answer: false,
        explain:
          "Most of the cost is ongoing maintenance: fixing bugs, keeping it running, adapting it to new platforms, and adding features.",
        source: "sec_introduction_maintainability.2",
      },
      {
        id: "ch02.q45",
        kind: "match",
        prompt: "Match each design principle to its goal.",
        pairs: [
          ["Operability", "Easy for the team to keep it running"],
          ["Simplicity", "Easy for new engineers to understand"],
          ["Evolvability", "Easy to change for needs nobody foresaw"],
        ],
        explain: "These three principles guide how the book thinks about maintainability.",
        source: "sec_introduction_maintainability.5",
      },
      {
        id: "ch02.q46",
        kind: "choice",
        prompt: "Why is more automation not always better for operations?",
        options: [
          "Automation tools are expensive",
          "When automation goes wrong it is harder to debug, and the leftover cases need more skilled people",
          "Operators prefer manual work",
          "Automated systems can't be monitored",
        ],
        answer: 1,
        explain:
          "Automation is a two-edged sword. The cases it can't handle are the hardest ones, and an automated system that misbehaves is harder to troubleshoot.",
        source: "id37.3",
      },
    ],
  },
  {
    id: "ch02.simplicity",
    afterBlockId: "sec_introduction_evolvability.4",
    blockHash: "cddbf6bc",
    title: "Simplicity and evolvability",
    questions: [
      {
        id: "ch02.q47",
        kind: "match",
        prompt: "Match each term to its meaning.",
        pairs: [
          ["Essential complexity", "Comes from the problem itself"],
          ["Accidental complexity", "Comes from limits of our tools"],
          ["Big ball of mud", "A project so tangled nobody understands it"],
        ],
        explain:
          "The line between essential and accidental shifts as tools improve, so the split is useful but not perfect.",
        source: "id38.4",
      },
      {
        id: "ch02.q48",
        kind: "choice",
        prompt: "What does the book call one of the best tools for managing complexity?",
        options: ["Abstraction", "More comments", "Fewer engineers", "Rewriting in a new language"],
        answer: 0,
        explain:
          "A good abstraction hides lots of detail behind a simple face and can be reused widely. SQL, for example, hides storage structures, concurrency, and crash recovery.",
        source: "id38.5",
      },
      {
        id: "ch02.q49",
        kind: "choice",
        prompt: "Why is irreversibility a big problem when changing a system?",
        options: [
          "Irreversible changes are slower to deploy",
          "If you can't switch back when something goes wrong, every change is much riskier",
          "Irreversible changes cost more cloud credits",
          "It is not a problem; it forces commitment",
        ],
        answer: 1,
        explain:
          "If you can easily go back, mistakes are cheap. Minimizing irreversibility makes a system more flexible and easier to evolve.",
        source: "sec_introduction_evolvability.4",
      },
    ],
  },
  {
    id: "ch02.check",
    afterBlockId: "sec_introduction_summary.4",
    blockHash: "a8887298",
    title: "Chapter check",
    questions: [
      {
        id: "ch02.c01",
        kind: "order",
        prompt:
          "Put the steps of a fan-out timeline in order, from a user posting to a follower reading.",
        items: [
          "A user makes a post",
          "The system looks up all their followers",
          "The post is written into each follower's stored timeline",
          "A follower opens the app and gets the precomputed timeline",
        ],
        explain:
          "Work moves from read time to write time: the post is delivered to every follower's timeline, so reading is fast.",
        source: "sec_introduction_materializing.2",
      },
      {
        id: "ch02.c02",
        kind: "choice",
        prompt:
          "Your dashboard shows a mean of 120 ms, but users complain the app feels slow. What should you look at?",
        options: [
          "The minimum response time",
          "High percentiles like p95 and p99",
          "The number of servers",
          "The mean over a longer window",
        ],
        answer: 1,
        explain:
          "The mean hides outliers. High percentiles show how bad the slowest requests are, and those are what unhappy users feel.",
        source: "id24.5",
      },
      {
        id: "ch02.c03",
        kind: "choice",
        prompt:
          "A database keeps 3 copies of every piece of data. One disk dies and users notice nothing. What happened?",
        options: [
          "A failure, tolerated by the users",
          "A fault, tolerated by the system",
          "A single point of failure",
          "A metastable failure",
        ],
        answer: 1,
        explain:
          "One part broke (a fault), but the system kept serving users, so there was no failure. That is fault tolerance at work.",
        source: "sec_introduction_reliability.5",
      },
      {
        id: "ch02.c04",
        kind: "truefalse",
        prompt:
          "Hardware faults tend to be highly correlated, while software faults are mostly independent.",
        answer: false,
        explain:
          "It is the other way around. Hardware faults are mostly independent; software faults hit every node running the same buggy code.",
        source: "sec_introduction_summary.3",
      },
      {
        id: "ch02.c05",
        kind: "blank",
        prompt: "Scalability is about keeping ___ the same when the load grows.",
        options: ["performance", "the code", "the team size", "the database schema"],
        answer: 0,
        explain:
          "Scalability is a system's ability to cope with more load, keeping performance within its targets at a reasonable cost.",
        source: "sec_introduction_summary.2",
      },
      {
        id: "ch02.c06",
        kind: "match",
        prompt: "Match each idea to the requirement it belongs to.",
        pairs: [
          ["Percentiles", "Performance"],
          ["Blameless postmortems", "Reliability"],
          ["Shared-nothing", "Scalability"],
          ["Abstraction", "Maintainability"],
        ],
        explain:
          "These are the four nonfunctional requirements this chapter covered, each with one of its key ideas.",
        source: "sec_introduction_summary.1",
      },
    ],
  },
];
