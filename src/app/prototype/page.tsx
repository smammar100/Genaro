"use client";

/**
 * Prototype page (see .claude/skills/prototype). Current feature: Add vehicle
 * — five variations grounded in Mobbin references, built with the Polaris
 * kit. Presentational only. Every case the real form handles (the five
 * sections and their fields, the DVLA lookup outcomes, "nothing mandatory",
 * VAT per cost row, to-dos, pricing, valuation, cost summary, draft, review)
 * appears in a variation or in the states strip at the foot.
 */
import * as React from "react";
import { CheckCircle2, Circle, CircleDot, Search, Sparkles } from "lucide-react";
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ContextualSaveBar,
  Layout,
  Page,
  ProgressBar,
  RadioButton,
  Select,
  SkeletonBodyText,
  Tabs,
  TextField,
  Thumbnail,
} from "@/components/polaris";
import { RegPlate } from "@/components/shared/reg-plate";

const PHOTO = "https://images.unsplash.com/photo-1677517859847-0e750bfd13a9?auto=format&fit=crop&w=480&h=360&q=70";

/* ── Shared sample pieces ──────────────────────────────────────────── */

const SECTIONS = [
  { id: "identity", title: "Vehicle identity", hint: "Reg lookup and specs", blank: 2 },
  { id: "buying", title: "Buying", hint: "Seller, owner, invoice", blank: 4 },
  { id: "costs", title: "Purchase costs", hint: "Price, fees, VAT", blank: 1 },
  { id: "receiving", title: "Receiving", hint: "Arrival, paperwork, to-dos", blank: 6 },
  { id: "review", title: "Review and submit", hint: "Confirm and save", blank: 0 },
];

function Req({ children }: { children: string }) {
  return (
    <span>
      {children} <span className="text-(--text-critical)" aria-hidden>*</span>
    </span>
  );
}

function FromDvla() {
  return <Badge tone="info" icon={<Sparkles className="size-3" />}>From DVLA</Badge>;
}

function RegLookup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField label={<Req>Registration</Req>} defaultValue="GK66 6NX" prefix="SearchMinor" />
        </div>
        <Button variant={compact ? "secondary" : "primary"}>Look up</Button>
      </div>
      {!compact && (
        <p className="body-sm text-(--text-secondary)">We check your stock book and fill make, year, colour and fuel from DVLA.</p>
      )}
      <div><Button variant="plain">No registration yet? Save it as unregistered</Button></div>
    </div>
  );
}

function IdentityFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label={<Req>Mileage</Req>} type="number" suffix="mi" defaultValue="47000" />
      <TextField label={<span className="flex items-center gap-2"><Req>Make</Req><FromDvla /></span>} defaultValue="BMW" />
      <TextField label={<span className="flex items-center gap-2"><Req>Model</Req><FromDvla /></span>} defaultValue="X1" />
      <TextField label="Variant name" placeholder="e.g. xDrive20d M Sport" />
      <TextField label="Variant code" placeholder="From the BCA invoice, e.g. 1.5 SE" />
      <TextField label={<span className="flex items-center gap-2">Year <FromDvla /></span>} defaultValue="2016" />
      <Select label="Vehicle type" options={["Car", "Van", "Motorcycle"]} />
      <Select label="Body type" options={["SUV", "Hatchback", "Saloon", "Estate", "MPV", "Coupe"]} />
      <Select label="Fuel type" options={["Diesel", "Petrol", "Hybrid", "Electric"]} />
      <Select label="Transmission" options={["Automatic", "Manual"]} />
      <TextField label="Colour" defaultValue="Silver" />
      <TextField label="Engine size (cc)" defaultValue="1995" />
      <TextField label="MOT expiry" defaultValue="14 Mar 2027" />
      <TextField label="Legacy S/N" helpText="Only for cars from the old sheet." />
    </div>
  );
}

function BuyingFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Select label="Source type" options={["Auction", "Private seller", "Trade-in", "Dealer", "Other"]} />
      <TextField label="Auction house" defaultValue="BCA Blackbushe" />
      <TextField label={<Req>Seller name</Req>} />
      <TextField label="Seller phone" type="tel" />
      <Select label="Dealer partner" options={["None", "Southall Car Sales", "West London Autos"]} />
      <div className="flex flex-col gap-1">
        <span className="body-md">Local or import</span>
        <div className="flex gap-4"><RadioButton label="Local" name="loi" defaultChecked /><RadioButton label="Import" name="loi" /></div>
      </div>
      <TextField label="Owned by" defaultValue="Car Capital" />
      <TextField label="Owner details" />
      <TextField label="Invoice date" defaultValue="22 Sep 2026" />
      <TextField label="Credit note date" />
      <Select label="Stocking finance" options={["None", "NextGear", "Close Brothers"]} />
    </div>
  );
}

const COSTS: [string, string, string][] = [
  ["Buying price", "9,850.00", ""],
  ["BCA buyer's fee", "395.00", "79.00"],
  ["BCA essential check / Assured", "65.00", "13.00"],
  ["BCA EV / hybrid Assured", "", ""],
  ["Battery health report", "", ""],
  ["Late payment / storage", "", ""],
  ["Collection", "120.00", "24.00"],
  ["Delivery / transport", "", ""],
  ["Other charges", "", ""],
];

function CostTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr><th className="text-left">Charge</th><th className="text-right">Amount</th><th className="text-right">VAT</th><th /></tr>
        </thead>
        <tbody>
          {COSTS.map(([label, amount, vat], i) => (
            <tr key={label}>
              <td className="body-md">{label}</td>
              <td className="w-36"><TextField label={`${label} amount`} labelHidden prefix="£" defaultValue={amount} /></td>
              <td className="w-36">{i === 0 ? <span className="body-sm text-(--text-secondary)">No VAT</span> : <TextField label={`${label} VAT`} labelHidden prefix="£" defaultValue={vat} />}</td>
              <td className="w-20">{i > 0 && <Button variant="plain">+20%</Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReceivingFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="Received date" defaultValue="26 Sep 2026" />
      <Select label="Received by" options={["Raza Jaffery", "Sam Ammar", "Tom Hughes"]} />
      <Select label="Log book (V5)" options={["Available", "Not available", "Applied for"]} />
      <TextField label="Number of keys" type="number" defaultValue="2" />
      <Select label="Service history" options={["Full", "Partial", "None", "Unknown"]} />
      <TextField label="Euro status" />
      <TextField label="Number of seats" type="number" />
      <TextField label="Former keepers" type="number" />
      <TextField label="Chassis / frame no." />
      <TextField label="Engine no." />
      <div className="sm:col-span-2"><Checkbox label="Lock nut received" defaultChecked /></div>
      <div className="sm:col-span-2"><TextField label="Other items received" multiline={2} /></div>
    </div>
  );
}

function TodoEditor() {
  return (
    <div className="flex flex-col gap-2">
      {[["Full service", "180"], ["MOT", "55"]].map(([t, c]) => (
        <div key={t} className="flex items-end gap-2">
          <div className="flex-1"><TextField label="Description" labelHidden defaultValue={t} /></div>
          <div className="w-28"><TextField label="Cost" labelHidden prefix="£" defaultValue={c} /></div>
          <Button variant="tertiary" icon="DeleteMinor" accessibilityLabel={`Remove ${t}`} />
        </div>
      ))}
      <div><Button icon="PlusMinor">Add item</Button></div>
    </div>
  );
}

function PricingFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <TextField label="Listing price" prefix="£" defaultValue="13,995" />
      <TextField label="Minimum sale price" prefix="£" defaultValue="12,750" />
      <TextField label="Warranty cost" prefix="£" defaultValue="150" />
    </div>
  );
}

function ValuationCard() {
  return (
    <Card title="AutoTrader valuation" actions={<Button variant="plain">Refresh</Button>}>
      <dl className="grid grid-cols-3 gap-2">
        {[["Retail", "£14,250"], ["Trade", "£11,900"], ["Part-ex", "£11,200"]].map(([k, v]) => (
          <div key={k}><dt className="body-sm text-(--text-secondary)">{k}</dt><dd className="heading-sm">{v}</dd></div>
        ))}
      </dl>
    </Card>
  );
}

function CostSummaryCard() {
  const rows: [string, string][] = [["Buying price", "£9,850.00"], ["Fees and charges", "£580.00"], ["VAT paid", "£116.00"], ["Things to do", "£235.00"]];
  return (
    <Card title="Cost summary">
      <dl className="flex flex-col gap-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3"><dt className="body-md text-(--text-secondary)">{k}</dt><dd className="body-md-numeric">{v}</dd></div>
        ))}
        <div className="flex justify-between gap-3 border-t border-(--border-secondary) pt-2"><dt className="body-md-semibold">Total cost</dt><dd className="heading-sm">£10,781.00</dd></div>
        <div className="flex justify-between gap-3"><dt className="body-sm text-(--text-secondary)">Margin at listing price</dt><dd className="body-md-numeric text-(--text-success)">£3,214.00</dd></div>
      </dl>
    </Card>
  );
}

function DvlaFound() {
  return <Banner tone="success" title="Found on DVLA">BMW X1, 2016, silver, diesel. We filled these in — check and adjust if needed.</Banner>;
}

/* ── A — Lookup first, then one page (Shopify Add product) ─────────── */
function VariationA() {
  return (
    <div className="flex flex-col">
      <ContextualSaveBar message="Unsaved vehicle" saveAction={{ content: "Save vehicle" }} discardAction={{ content: "Discard" }} />
      <Page title="Add vehicle" backAction={{ content: "Vehicles" }} secondaryActions={[{ content: "Save as draft" }]} className="w-full">
        <Layout>
          <Layout.Section>
            <Card title="Start with the registration">
              <RegLookup />
            </Card>
            <Card>
              <div className="flex flex-wrap items-center gap-4">
                <Thumbnail source={PHOTO} alt="" size="large" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><RegPlate registration="GK66 6NX" size="sm" /><Badge tone="success" progress="complete">Found on DVLA</Badge></div>
                  <p className="heading-md mt-1">2016 BMW X1</p>
                  <p className="body-sm text-(--text-secondary)">Silver · Diesel · 1,995cc · MOT until 14 Mar 2027</p>
                </div>
                <Button variant="plain">Edit details</Button>
              </div>
            </Card>
            <Card title="Vehicle identity"><IdentityFields /></Card>
            <Card title="Buying"><BuyingFields /></Card>
            <Card title="Purchase costs" padding="0"><div className="p-4 pb-0 body-sm text-(--text-secondary)">VAT is only what you enter; +20% fills the standard rate.</div><CostTable /></Card>
            <Card title="Receiving"><ReceivingFields /></Card>
            <Card title="Things to do"><TodoEditor /></Card>
            <Card title="Pricing"><PricingFields /></Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card title="Status">
              <Select label="Stock status" labelHidden options={["Received", "Inspection pending"]} />
              <p className="body-sm text-(--text-secondary)">New cars start as Received and go to inspection.</p>
            </Card>
            <ValuationCard />
            <CostSummaryCard />
            <Card title="Still blank">
              <p className="body-sm text-(--text-secondary)">Nothing is required. These important fields are empty:</p>
              <ul className="flex flex-col gap-1 body-md">
                <li>Seller name</li><li>Received by</li><li>Listing price</li>
              </ul>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </div>
  );
}

/* ── B — One annotated page with section nav (Etsy listing) ────────── */
function VariationB() {
  const Section = ({ title, description, children }: { title: string; description: string; children: React.ReactNode }) => (
    <Layout.AnnotatedSection title={title} description={description}>
      <Card>{children}</Card>
    </Layout.AnnotatedSection>
  );
  return (
    <Page title="Add vehicle" backAction={{ content: "Vehicles" }} fullWidth>
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Sections" className="hidden lg:block">
          <div className="sticky top-4 flex flex-col gap-3">
            <div>
              <p className="body-sm text-(--text-secondary)">68% complete</p>
              <ProgressBar progress={68} size="small" />
            </div>
            <ul className="flex flex-col gap-0.5">
              {SECTIONS.slice(0, 4).concat({ id: "pricing", title: "Pricing", hint: "", blank: 1 }).map((s, i) => (
                <li key={s.id}>
                  <a href="#" className={`flex items-center justify-between rounded-(--radius-200) px-2 py-1.5 body-md hover:bg-(--bg-surface-hover) ${i === 0 ? "bg-(--bg-surface-selected) body-md-semibold" : ""}`}>
                    {s.title}
                    {s.blank ? <Badge tone="attention">{`${s.blank} blank`}</Badge> : <CheckCircle2 className="size-4 text-(--icon-success)" />}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <div className="flex flex-col gap-2">
          <Layout>
            <Section title="Registration" description="Look up the car to fill its details from DVLA. No reg yet? Save it as unregistered and add the reg later.">
              <RegLookup compact />
              <DvlaFound />
            </Section>
            <Section title="Vehicle identity" description="Fields marked * matter most, but nothing blocks saving."><IdentityFields /></Section>
            <Section title="Buying" description="Where the car came from and who owns it."><BuyingFields /></Section>
            <Section title="Purchase costs" description="VAT is only what you enter. Use +20% for the standard rate."><CostTable /></Section>
            <Section title="Receiving" description="Arrival, paperwork and what came with the car."><ReceivingFields /></Section>
            <Section title="Things to do" description="Work the car needs. Each item becomes a prep job."><TodoEditor /></Section>
            <Section title="Pricing" description="What you plan to list it at."><PricingFields /></Section>
          </Layout>
          <div className="sticky bottom-0 -mx-6 flex items-center justify-between gap-3 border-t border-(--border) bg-(--bg-surface) px-6 py-3">
            <span className="body-sm text-(--text-secondary)">Total cost £10,781 · margin £3,214 at listing price</span>
            <div className="flex gap-2"><Button>Save as draft</Button><Button variant="primary">Save vehicle</Button></div>
          </div>
        </div>
      </div>
    </Page>
  );
}

/* ── C — Refined wizard with step rail (Klook) ─────────────────────── */
function VariationC() {
  const current = 0;
  return (
    <div className="flex flex-col">
      <Page title="Add vehicle" subtitle="Step 1 of 5 · Vehicle identity" backAction={{ content: "Vehicles" }} fullWidth className="w-full">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr_300px]">
          <Card>
            <ol className="flex flex-col gap-1">
              {SECTIONS.map((s, i) => {
                const Icon = i < current ? CheckCircle2 : i === current ? CircleDot : Circle;
                return (
                  <li key={s.id} className={`flex gap-3 rounded-(--radius-200) p-2 ${i === current ? "bg-(--bg-surface-selected)" : ""}`}>
                    <Icon className={`mt-0.5 size-4 shrink-0 ${i === current ? "text-(--icon)" : "text-(--icon-secondary)"}`} />
                    <div className="min-w-0">
                      <p className={i === current ? "body-md-semibold" : "body-md"}>{s.title}</p>
                      <p className="body-sm text-(--text-secondary)">{s.blank ? `${s.hint} · ${s.blank} blank` : s.hint}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            <Card title="Registration">
              <RegLookup />
              <DvlaFound />
            </Card>
            <Card title="Specs"><IdentityFields /></Card>
          </div>
          <div className="flex flex-col gap-4">
            <ValuationCard />
            <CostSummaryCard />
          </div>
        </div>
      </Page>
      <div className="sticky bottom-0 flex items-center justify-between border-t border-(--border) bg-(--bg-surface) px-6 py-3">
        <Button disabled>Back</Button>
        <div className="flex items-center gap-3">
          <span className="body-sm text-(--text-secondary)">2 important fields blank — you can still continue</span>
          <Button>Save as draft</Button>
          <Button variant="primary">Continue to buying</Button>
        </div>
      </div>
    </div>
  );
}

/* ── D — Section tabs with a live stock card (Etsy Shop Manager) ───── */
function VariationD() {
  const [tab, setTab] = React.useState(2);
  return (
    <Page title="Add vehicle" backAction={{ content: "Vehicles" }} primaryAction={{ content: "Save vehicle" }} secondaryActions={[{ content: "Save as draft" }]} fullWidth>
      <Tabs
        tabs={SECTIONS.map((s) => ({ id: s.id, content: s.title, badge: s.blank ? String(s.blank) : undefined }))}
        selected={tab}
        onSelect={setTab}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          {tab === 0 && <><Card title="Registration"><RegLookup compact /><DvlaFound /></Card><Card title="Specs"><IdentityFields /></Card></>}
          {tab === 1 && <Card title="Buying"><BuyingFields /></Card>}
          {tab === 2 && <Card title="Purchase costs" padding="0"><CostTable /></Card>}
          {tab === 3 && <><Card title="Receiving"><ReceivingFields /></Card><Card title="Things to do"><TodoEditor /></Card><Card title="Pricing"><PricingFields /></Card></>}
          {tab === 4 && <Banner tone="warning" title="3 important fields are blank">Seller name, received by and listing price. You can save now and fill them in later.</Banner>}
        </div>
        <div className="flex flex-col gap-4">
          <Card padding="0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PHOTO} alt="" className="aspect-[4/3] w-full object-cover" />
            <div className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2"><RegPlate registration="GK66 6NX" size="sm" /><Badge>Received</Badge></div>
              <p className="heading-sm">2016 BMW X1</p>
              <p className="body-sm text-(--text-secondary)">47,000 mi · Diesel · Automatic · Silver</p>
              <div className="grid grid-cols-2 gap-2 border-t border-(--border-secondary) pt-2">
                <div><p className="body-sm text-(--text-secondary)">Total cost</p><p className="heading-sm">£10,781</p></div>
                <div><p className="body-sm text-(--text-secondary)">Listing price</p><p className="heading-sm">£13,995</p></div>
              </div>
              <p className="body-sm text-(--text-success)">£3,214 margin</p>
            </div>
          </Card>
          <ValuationCard />
        </div>
      </div>
    </Page>
  );
}

/* ── E — Quick add, then complete the details (Salesforce) ─────────── */
function VariationE() {
  return (
    <Page title="Add vehicle" backAction={{ content: "Vehicles" }}>
      <div className="flex flex-col gap-4">
        <Card title="Quick add">
          <p className="body-sm text-(--text-secondary)">Get the car into stock now. Everything else can be filled in straight after, or later from the vehicle page.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><RegLookup compact /></div>
            <TextField label={<Req>Mileage</Req>} type="number" suffix="mi" defaultValue="47000" />
            <TextField label={<Req>Buying price</Req>} prefix="£" defaultValue="9,850" />
            <Select label="Source type" options={["Auction", "Private seller", "Trade-in", "Dealer", "Other"]} />
            <TextField label="Received date" defaultValue="26 Sep 2026" />
          </div>
          <DvlaFound />
          <div className="flex justify-end gap-2"><Button>Save as draft</Button><Button variant="primary">Add to stock</Button></div>
        </Card>
        <Card title="Complete the details" actions={<Badge tone="attention">3 of 6 done</Badge>} padding="0">
          <ul>
            {[
              { t: "Vehicle identity", d: "Filled from DVLA · 2 blank", done: true },
              { t: "Buying", d: "Seller, owner, invoice · 4 blank", done: false },
              { t: "Purchase costs", d: "£580 fees entered · 1 blank", done: true },
              { t: "Receiving and paperwork", d: "6 blank", done: false },
              { t: "Things to do", d: "2 items · £235", done: true },
              { t: "Pricing", d: "Listing price blank", done: false },
            ].map((r) => (
              <li key={r.t} className="flex items-center gap-3 border-t border-(--border-secondary) px-4 py-3 first:border-t-0 hover:bg-(--bg-surface-hover)">
                {r.done ? <CheckCircle2 className="size-5 text-(--icon-success)" /> : <Circle className="size-5 text-(--icon-secondary)" />}
                <div className="min-w-0 flex-1"><p className="body-md-semibold">{r.t}</p><p className="body-sm text-(--text-secondary)">{r.d}</p></div>
                <Button variant="plain">{r.done ? "Edit" : "Fill in"}</Button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Buying" actions={<Button variant="plain">Collapse</Button>}><BuyingFields /></Card>
      </div>
    </Page>
  );
}

/* ── States every variation needs ──────────────────────────────────── */
function States() {
  return (
    <div className="grid gap-4 p-6 lg:grid-cols-2">
      <Card title="Looking up the registration">
        <div className="flex items-center gap-2 body-sm text-(--text-secondary)"><Search className="size-4" />Checking DVLA and your stock book…</div>
        <SkeletonBodyText lines={3} />
      </Card>
      <div className="flex flex-col gap-3">
        <DvlaFound />
        <Banner tone="warning" title="Not found on DVLA">The number may be mistyped. Check it, or fill in the details yourself.</Banner>
        <Banner tone="info" title="GK66 6NX is already in stock" action={{ content: "Open D-0004" }}>Adding it again creates a duplicate. Open the existing car instead?</Banner>
        <Banner tone="info" title="Saving without a registration">This car will be saved as UNREGISTERED. You can add the reg later from the vehicle page.</Banner>
        <Banner tone="critical" title="Fix 2 errors to save">Mileage must be a number. Listing price can't be lower than the minimum sale price.</Banner>
      </div>
    </div>
  );
}

const VARIATIONS = [
  { key: "A", name: "Lookup first, then one page", refs: "Shopify Add product", C: VariationA },
  { key: "B", name: "One annotated page with section nav", refs: "Etsy listing details", C: VariationB },
  { key: "C", name: "Refined wizard with step rail", refs: "Klook merchant onboarding", C: VariationC },
  { key: "D", name: "Section tabs with a live stock card", refs: "Etsy Shop Manager", C: VariationD },
  { key: "E", name: "Quick add, then complete the details", refs: "Salesforce quick create", C: VariationE },
];

export default function PrototypePage() {
  return (
    <main className="flex flex-col gap-10 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="heading-lg">Prototype — Add vehicle</h1>
        <p className="body-md text-(--text-secondary)">
          Five directions for the same form: registration lookup, identity, buying, purchase costs with VAT, receiving,
          things to do, pricing, valuation and cost summary. Nothing is mandatory; * marks important fields. Lookup and
          error states are at the foot. Pick one (A–E).
        </p>
      </header>
      {VARIATIONS.map(({ key, name, refs, C }) => (
        <section key={key} id={`variation-${key}`} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-3">
            <h2 className="heading-md">{`Variation ${key} — ${name}`}</h2>
            <span className="body-sm text-(--text-secondary)">{`Reference: ${refs}`}</span>
          </div>
          <div className="relative overflow-hidden rounded-(--radius-400) border border-(--border) bg-(--bg)">
            <C />
          </div>
        </section>
      ))}
      <section id="states" className="flex flex-col gap-2">
        <h2 className="heading-md">States (all variations)</h2>
        <div className="overflow-hidden rounded-(--radius-400) border border-(--border) bg-(--bg)"><States /></div>
      </section>
    </main>
  );
}
