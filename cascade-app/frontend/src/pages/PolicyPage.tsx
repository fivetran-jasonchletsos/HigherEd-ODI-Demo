export default function PolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 border-b border-[var(--hairline)] pb-6">
        <div className="eyebrow mb-1">Position paper</div>
        <h1 className="font-serif text-5xl font-semibold text-[var(--ink-strong)] tracking-tight leading-tight">
          Why higher education's data lives in six places, and how an open lake bridges them
        </h1>
        <p className="mt-3 text-[var(--ink-muted)] font-body-serif text-lg">A note from the Office of the CIO, May 2026.</p>
      </header>

      <article className="prose-academic font-body-serif text-[17px] leading-relaxed text-[var(--ink)] space-y-5">
        <p className="dropcap">
          Higher education's data architecture is not the product of a single design decision.
          It is the residue of forty years of best-in-class system selection, each made by a
          different vice president, each defensible at the time, each loyal to a different
          governance committee.
        </p>
        <p>
          The student information system, the human resources system, the learning management
          system, the customer relationship management system, the grants management system,
          the advancement system — these were never going to be one product. The vendors
          serving them are excellent at what they do precisely because they specialize. Banner
          does not aspire to be Workday. Canvas does not aspire to be Salesforce. Slate does
          not aspire to be Cayuse. They were built by people who understand their domains
          deeply, and they will outlive most of the executives who selected them.
        </p>
        <p>
          And yet the questions Cascade University needs to answer span all six. <em>Why is yield
          down 130 basis points this cycle?</em> The data for that question lives in Slate
          (application behavior), Banner (financial aid package), Salesforce Education Cloud
          (recruitment touches), Canvas (orientation engagement), and Workday (institutional
          aid budget). <em>Which 1,200 students are at academic risk this week?</em> The data lives in
          Banner (midterm grades), Canvas (assignment submissions, LMS engagement), and the
          faculty early-alert workflow in Salesforce.
        </p>
        <hr className="diploma-rule my-8" />
        <h2 className="font-serif text-3xl font-semibold text-[var(--ink-strong)] tracking-tight">The warehouse-centric era</h2>
        <p>
          For the last fifteen years, the answer was the data warehouse. Pull every system's
          data through a nightly ETL job. Land it in a star schema. Make every report read from
          that one place. This worked. It also produced four predictable failure modes that
          every higher-ed CIO will recognize.
        </p>
        <ol className="list-decimal pl-6 space-y-3">
          <li><strong className="text-[var(--ink-strong)]">Latency.</strong> Yesterday's data is rarely good enough when the question is "who melted overnight." The advisor needs Canvas engagement from this morning, not from last night's batch.</li>
          <li><strong className="text-[var(--ink-strong)]">Schema brittleness.</strong> Banner upgrades, Canvas changes a column type, Slate ships a new field, and the ETL job breaks at 3 a.m. The data team spends more time keeping the warehouse alive than building new models.</li>
          <li><strong className="text-[var(--ink-strong)]">Vendor concentration.</strong> The warehouse vendor owns the storage layer and the compute layer. Egress is expensive. Federal reporting, federated research collaborations, and AI agents all want to read the same data, and each new consumer pays a tax.</li>
          <li><strong className="text-[var(--ink-strong)]">Agent-shaped questions.</strong> An advising agent needs to read student records, course performance, financial aid status, and the early-alert workflow in a single context. A warehouse view that exists for a tabular dashboard does not.</li>
        </ol>
        <hr className="diploma-rule my-8" />
        <h2 className="font-serif text-3xl font-semibold text-[var(--ink-strong)] tracking-tight">What ODI changes</h2>
        <p>
          Open Data Infrastructure is not another warehouse migration. It is a different choice
          about where the center of gravity lives. The center is the lake, the storage format
          is open (Apache Iceberg), the catalog is open (Snowflake Polaris and AWS Glue), and the
          compute layer is whatever an analyst, a federal report, or an AI agent needs in the
          moment.
        </p>
        <p>
          Cascade lands every source into Iceberg tables on S3 through Fivetran connectors.
          dbt builds the conformed silver layer and the gold business marts. Snowflake reads the
          gold marts directly through external tables, with no warehouse round-trip. Cortex agents
          read the same gold marts. The federal IPEDS submission reads the same gold marts. The
          VP for Research's grant pipeline dashboard reads the same gold marts.
        </p>
        <p>
          The architectural commitment is that there is exactly one definition of a student, one
          definition of a course, one definition of a gift, and one definition of an award.
          Everything else reads from those definitions.
        </p>
        <hr className="diploma-rule my-8" />
        <h2 className="font-serif text-3xl font-semibold text-[var(--ink-strong)] tracking-tight">Three commitments</h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li><strong className="text-[var(--ink-strong)]">Customer-owned storage.</strong> The lake lives in Cascade's S3 account. Fivetran writes; Cascade reads with any engine.</li>
          <li><strong className="text-[var(--ink-strong)]">Open table format.</strong> Iceberg v2, with ACID, schema evolution, partition evolution, time-travel queries. No vendor lock-in on table layout.</li>
          <li><strong className="text-[var(--ink-strong)]">Multi-engine compute.</strong> Snowflake today. Trino, Athena, DuckDB, Spark tomorrow. Compute is a pluggable layer.</li>
        </ol>
        <hr className="diploma-rule my-8" />
        <p className="italic text-[var(--ink-muted)]">
          Banner, Workday, Salesforce, Canvas, Slate, and Cayuse will be at Cascade University
          for at least another decade. The lake is the architectural choice that makes that
          fact a feature instead of a constraint.
        </p>
      </article>
    </div>
  );
}
