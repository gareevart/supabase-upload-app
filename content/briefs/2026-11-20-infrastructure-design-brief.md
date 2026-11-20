# Infrastructure Design Brief — November 14–20, 2026

Welcome back. This week, developer platforms made more technical work easier to see and control. We will look at shared app workspaces, clearer deployment steps, safer file sharing with agents, and simpler ways to manage access and cost.

## Three trends this week

- **One product can support several ways of working.** A prompt, a dashboard, and a developer tool can lead to the same app and history.
- **Setup is becoming a guided decision.** Products show the account, plan, permissions, or system state before users continue.
- **Hidden work is becoming visible.** Network health, saved credentials, and agent context now need clear explanations.

## 1. Netlify gives the whole team one app workspace

**Company:** Netlify  
**Published:** November 18, 2026  
**Availability:** Gradual rollout, starting with most new users; existing users can join a waitlist.  
**Primary source:** [The new Netlify experience](https://www.netlify.com/changelog/2026-11-18-new-netlify-experience/)

Developers and designers often work on the same app through different tools. Netlify's new dashboard brings prompts, file uploads, Git imports, and connected agents into one app workspace. Every change creates a version with a preview that the team can review, archive, or publish. A versions menu separates work in progress from the published app, even when the project does not use Git, the system developers use to track code changes. Settings now have search and plain-language descriptions, while a “Who can see it” section controls access.

**Design takeaway — my interpretation:** Give different users several ways to start, but keep one clear model for the app, its versions, and its public state.

**Podcast question:** Can a version menu serve both a designer who uses prompts and a developer who uses Git?

## 2. Fly.io brings deployment review into its API

**Company:** Fly.io  
**Published:** November 17, 2026  
**Availability:** Experimental; the API may change and currently supports GitHub-based sources.  
**Primary source:** [Experimental Deployments API](https://fly.io/changelog/experimental-deployments-api/)

A deployment turns code into a running app, and its progress can be hard to understand outside a dashboard. Fly.io now offers an API that follows the workflow of its Launch interface, so other tools can start and inspect deployments. Its published endpoint summary includes a diagnosis report with the failed step, useful logs, and suggested next steps. A launch can also wait for a person to review its plan before it continues, and blocked actions can return a reason and a link for the person to use.

**Source caveat:** The detailed endpoint summary in the official post is explicitly labeled as AI-written. Treat those details as experimental and check the linked API specification before building against them.

**Design takeaway — my interpretation:** An automated workflow needs the same review, error explanation, and handoff points as a visual interface.

**Podcast question:** When an agent cannot continue a deployment, what should it show before handing the task back to a person?

## 3. Cloudflare lets users show Agent Lee the problem

**Company:** Cloudflare  
**Published:** November 18, 2026  
**Availability:** Agent Lee remains in beta.  
**Primary source:** [Attach images, PDFs, and text files to Agent Lee](https://developers.cloudflare.com/changelog/post/2026-11-18-agent-lee-attachments/)

Explaining an error in chat is slow when the evidence is a screenshot or a long log file. Agent Lee now accepts images, PDFs, and text files through a paperclip, paste, or drag and drop. Each file appears as a small item above the message box, where the user can remove it before sending. Before sending a HAR file, which records browser network activity, the browser removes request bodies, cookies, and selected credential headers. Long text files may be shortened, scanned PDFs cannot be read, and older attachments eventually leave the agent's active context.

**Design takeaway — my interpretation:** An attachment interface should explain what was removed, what the agent can read, and what it no longer remembers. Automatic cleanup does not make every file safe to share.

**Podcast question:** Should a chat show a preview of the exact file content an agent will receive?

## 4. Railway replaces copied AI keys with linked billing

**Company:** Railway  
**Published:** November 17, 2026  
**Primary source:** [Linked billing with Claude Platform](https://blog.railway.com/p/linked-billing-claude-platform)

Teams using Claude through Railway previously needed to paste in an API key, a secret that lets software access a service. Railway now lets an administrator link a workspace to an existing Claude Platform organization, so Anthropic bills that organization directly. The approval flow includes an organization choice and an optional monthly spending limit, while model pickers label the linked provider. When a spending limit is reached, the connection card shows that state and users can choose another Railway model. Existing personal-key defaults still take priority, and the link changes billing only; requests still run in Railway's organization.

**Design takeaway — my interpretation:** Removing secret copying simplifies setup, but the interface must still explain which account pays and where requests run.

**Podcast question:** How can a model picker make billing ownership clear without becoming a billing dashboard?

## 5. DigitalOcean adds everyday controls to MicroVMs

**Company:** DigitalOcean  
**Published:** November 17, 2026, in the release notes  
**Availability:** Generally available in the MKC1 region.  
**Primary source:** [DigitalOcean release notes — November 17](https://docs.digitalocean.com/release-notes/)

A MicroVM is a small isolated virtual computer that can run code and tools. DigitalOcean's general-availability release adds ways to change its settings without creating a replacement, move files, and add web addresses for extra ports. Users can create an access token for only one MicroVM and limit the outside services it may contact. The platform can also add credentials to outgoing requests, while a console, metrics, logs, and traces help users inspect the machine. These controls make the machine easier to manage after the first successful launch.

**Design takeaway — my interpretation:** A good creation flow is only the start. The product also needs clear controls for access, changes, files, and investigation during daily use.

**Podcast question:** Which controls should appear first when a designer opens the page for an agent's computer?

## 6. Vercel puts private and public AI models in one place

**Company:** Vercel  
**Published:** November 16, 2026  
**Primary source:** [AI Gateway now supports Private Inference](https://vercel.com/changelog/ai-gateway-now-supports-private-inference)

A team may use public AI models alongside models that it runs itself. Vercel's AI Gateway, a shared entry point for model requests, now lets teams connect their own model endpoints. Setup asks for the service address, API format, and credentials, then the models that service provides. Private models appear beside catalog traffic in logs and charts, while only the team's members can view or call them. Teams can also choose a public catalog model as a backup if their private endpoint fails.

**Design takeaway — my interpretation:** A shared interface reduces learning, but private models still need clear labels. A backup choice should explain when a request may move to another provider.

**Podcast question:** Should a switch from a private model to a public backup require a visible warning?

## 7. AWS helps teams decide whether the network is at fault

**Company:** AWS  
**Published:** November 18, 2026  
**Availability:** Regional availability is listed in the linked documentation.  
**Primary source:** [CloudWatch network path monitoring](https://aws.amazon.com/about-aws/whats-new/2026/11/cloudwatch-network-path-monitoring/)

When an app becomes slow, a team may not know whether to inspect its code or the cloud network. CloudWatch now lets users select their private cloud networks and receive network-path measurements within minutes, without installing software. The measurements include delay, traffic volume, and an impact score based on the path's recent history and other measured paths. AWS gives an example where a high score helps a team contact AWS Support, while a healthy path helps it focus on the app. The data can also feed dashboards and alarms.

**Design takeaway — my interpretation:** Monitoring should help users choose the next investigation. A score is more useful when it explains what it measures and supports a clear next step.

**Podcast question:** How should a dashboard explain a health score without making it look more certain than it is?

## What to skip

- **Render: stacked pull-request previews, November 18.** A pull request is a proposed code change; a stack is a chain of related changes. Previews now work for each request in the chain, but this is the rollout of a feature already announced in an earlier brief. Automatic previews can create extra billable resources. [Source](https://render.com/changelog/create-separate-service-previews-and-preview-environments-for-stacked-prs)
- **Vercel Board, November 18.** An experimental shared message board for agent tasks, with threads, channel access, and connected conversations. Worth watching, but it overlaps with the agent collaboration pattern discussed in recent editions. [Source](https://vercel.com/changelog/vercel-board-is-now-available)
- **Supabase custom sign-in providers, November 17.** Dashboard setup adds an issuer URL field, inline validation, and a list of existing providers. Useful, but a smaller extension to an existing workflow. [Source](https://supabase.com/changelog/custom-oidc-third-party-auth)
- **PlanetScale Insights Agent feedback, November 19.** Feedback can distinguish a wrong diagnosis from advice that is too risky or already known. A useful small pattern, rather than a full new workflow. [Source](https://planetscale.com/changelog/insights-agent-run-feedback)
- **Docker Firecrawl kit, November 16.** Adds controlled web access for sandboxed agents. The kit is experimental and the post says its walkthrough steps are current for October, so the publication date does not prove every capability is new this week. [Source](https://www.docker.com/blog/docker-sandboxes-firecrawl-web-access/)
- **HashiCorp HCP governance roundup, November 16.** Covers sign-in, access, and account administration across the past quarter. Individual feature launch dates are not clear enough to treat the whole roundup as new this week. [Source](https://www.hashicorp.com/en/blog/hcp-introduces-ibmid-support-and-new-enterprise-governance-capabilities)
- **Neon, Azure, and Google Cloud.** Neon's November 19 Postgres release is mainly a database-engine update. Azure App Service Builder has a November 17 roadmap entry, but the exact publication date could not be confirmed from the live update page. Google's relevant agent-observability post is dated November 13, outside this edition's November 14–20 window. [Neon](https://neon.com/blog/postgres-19-is-out-try-it-on-neon) · [Azure](https://azure.microsoft.com/en-us/updates?id=578817) · [Google Cloud](https://cloud.google.com/blog/products/data-analytics/enterprise-ai-agent-observability-with-bigquery-and-looker)

## Outro

That is the week. The best changes help people understand what will happen, which account is responsible, and where to look when something fails. As more work moves between people and agents, those simple explanations become part of the infrastructure.
