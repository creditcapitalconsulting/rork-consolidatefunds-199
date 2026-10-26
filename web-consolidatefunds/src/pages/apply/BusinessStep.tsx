import { Plus, Trash2 } from "lucide-react";
import { Field } from "@/components/fields";
import { Grid, Section } from "@/components/ui-kit";
import { ENTITY_TYPES, INDUSTRIES, US_STATES } from "@/lib/config";
import { dobValid, fmtDob, fmtSsn, ssnValid, zipValid } from "@/lib/format";
import { blankOwner, uid } from "@/lib/sample";
import { useStore } from "@/lib/store";
import type { BusinessInfo, Owner } from "@/lib/types";

const o = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
const CREDIT = o(["760+", "700–759", "650–699", "600–649", "Below 600"]);

export function BusinessStep() {
  const { draft, updateDraft } = useStore();
  const b = draft.business;
  const set = (k: keyof BusinessInfo) => (v: string) =>
    updateDraft((d) => ({ ...d, business: { ...d.business, [k]: v } }));
  const setOwner = (id: string, k: keyof Owner, v: string) =>
    updateDraft((d) => ({
      ...d,
      business: {
        ...d.business,
        owners: d.business.owners.map((x) =>
          x.id === id ? { ...x, [k]: v } : x,
        ),
      },
    }));
  const totalOwnership = b.owners.reduce(
    (a, x) => a + (Number(x.ownership) || 0),
    0,
  );
  const setOwnerFmt =
    (id: string, k: "ssn" | "dob", fmt: (v: string) => string) => (v: string) =>
      updateDraft((d) => ({
        ...d,
        business: {
          ...d.business,
          owners: d.business.owners.map((x) =>
            x.id === id ? { ...x, [k]: fmt(v) } : x,
          ),
        },
      }));

  return (
    <div className="space-y-6">
      <Section
        title="Company"
        description="Legal details as they appear on your formation documents."
      >
        <Grid>
          <Field
            label="Legal business name"
            required
            value={b.legalName}
            onChange={set("legalName")}
          />
          <Field label="DBA (if any)" value={b.dba} onChange={set("dba")} />
          <Field
            label="EIN"
            value={b.ein}
            onChange={set("ein")}
            placeholder="12-3456789"
          />
          <Field
            label="Entity type"
            kind="select"
            options={o(ENTITY_TYPES)}
            value={b.entity}
            onChange={set("entity")}
          />
          <Field
            label="State of incorporation"
            kind="select"
            options={o(US_STATES)}
            value={b.stateOfIncorporation}
            onChange={set("stateOfIncorporation")}
          />
          <Field
            label="Date established"
            kind="date"
            value={b.established}
            onChange={set("established")}
          />
          <Field
            label="Industry"
            required
            kind="select"
            options={o(INDUSTRIES)}
            value={b.industry}
            onChange={set("industry")}
          />
          <Field
            label="Number of employees"
            kind="number"
            value={b.employees}
            onChange={set("employees")}
          />
          <Field
            label="Website"
            value={b.website}
            onChange={set("website")}
            placeholder="https://"
          />
          <Field
            label="What does the business do?"
            kind="textarea"
            value={b.description}
            onChange={set("description")}
            className="sm:col-span-2 lg:col-span-3"
          />
        </Grid>
      </Section>

      <Section title="Address & contact">
        <Grid>
          <Field
            label="Street address"
            value={b.street}
            onChange={set("street")}
            className="lg:col-span-2"
          />
          <Field label="City" value={b.city} onChange={set("city")} />
          <Field
            label="State"
            kind="select"
            options={o(US_STATES)}
            value={b.state}
            onChange={set("state")}
          />
          <Field label="ZIP" value={b.zip} onChange={set("zip")} />
          <div className="hidden lg:block" />
          <Field
            label="Primary contact name"
            value={b.contactName}
            onChange={set("contactName")}
          />
          <Field
            label="Contact email"
            required
            type="email"
            value={b.contactEmail}
            onChange={set("contactEmail")}
          />
          <Field
            label="Contact phone"
            type="tel"
            value={b.contactPhone}
            onChange={set("contactPhone")}
          />
        </Grid>
      </Section>

      <Section
        title="Owners & guarantors"
        description="List everyone with 20% or more ownership."
        action={
          <span
            className={`num text-sm ${totalOwnership > 100 ? "text-danger" : "text-muted-foreground"}`}
          >
            {totalOwnership}% listed
          </span>
        }
      >
        <div className="space-y-4">
          {b.owners.map((ow, i) => {
            const started = !!ow.name.trim();
            const req = (v: string) =>
              started && !v.trim() ? "Required" : undefined;
            return (
              <fieldset
                key={ow.id}
                className="rounded-xl border border-border p-4"
              >
                <legend className="flex w-full items-center justify-between px-1 text-sm font-medium">
                  Owner {i + 1}
                </legend>
                <Grid>
                  <Field
                    label="Full name"
                    required
                    value={ow.name}
                    onChange={(v) => setOwner(ow.id, "name", v)}
                  />
                  <Field
                    label="Title"
                    value={ow.title}
                    onChange={(v) => setOwner(ow.id, "title", v)}
                  />
                  <Field
                    label="Ownership"
                    kind="percent"
                    value={ow.ownership}
                    onChange={(v) => setOwner(ow.id, "ownership", v)}
                  />
                  <Field
                    label="Email"
                    type="email"
                    value={ow.email}
                    onChange={(v) => setOwner(ow.id, "email", v)}
                  />
                  <Field
                    label="Phone"
                    type="tel"
                    value={ow.phone}
                    onChange={(v) => setOwner(ow.id, "phone", v)}
                  />
                  <Field
                    label="Estimated personal credit"
                    kind="select"
                    options={CREDIT}
                    value={ow.creditRange}
                    onChange={(v) => setOwner(ow.id, "creditRange", v)}
                    hint="Self-reported; no credit pull at this stage"
                  />
                </Grid>

                <h4 className="eyebrow mt-5">Home address & identity</h4>
                <Grid className="mt-2">
                  <Field
                    label="Home street address"
                    required
                    value={ow.homeStreet}
                    onChange={(v) => setOwner(ow.id, "homeStreet", v)}
                    error={req(ow.homeStreet)}
                    placeholder="123 Main St, Apt 4"
                    className="lg:col-span-2"
                  />
                  <Field
                    label="Home city"
                    required
                    value={ow.homeCity}
                    onChange={(v) => setOwner(ow.id, "homeCity", v)}
                    error={req(ow.homeCity)}
                  />
                  <Field
                    label="Home state"
                    required
                    kind="select"
                    options={o(US_STATES)}
                    value={ow.homeState}
                    onChange={(v) => setOwner(ow.id, "homeState", v)}
                    error={req(ow.homeState)}
                  />
                  <Field
                    label="Home ZIP"
                    required
                    inputMode="numeric"
                    value={ow.homeZip}
                    onChange={(v) =>
                      setOwner(
                        ow.id,
                        "homeZip",
                        v.replace(/[^\d-]/g, "").slice(0, 10),
                      )
                    }
                    error={
                      req(ow.homeZip) ??
                      (ow.homeZip && !zipValid(ow.homeZip)
                        ? "Use 5 digits (e.g. 85021)"
                        : undefined)
                    }
                    placeholder="85021"
                  />
                  <Field
                    label="Social Security Number"
                    required
                    inputMode="numeric"
                    value={ow.ssn}
                    onChange={setOwnerFmt(ow.id, "ssn", fmtSsn)}
                    error={
                      req(ow.ssn) ??
                      (ow.ssn && !ssnValid(ow.ssn)
                        ? "Use the format XXX-XX-XXXX"
                        : undefined)
                    }
                    placeholder="XXX-XX-XXXX"
                    hint="Used for identity verification only; encrypted at rest in production"
                  />
                  <Field
                    label="Date of birth"
                    required
                    inputMode="numeric"
                    value={ow.dob}
                    onChange={setOwnerFmt(ow.id, "dob", fmtDob)}
                    error={
                      req(ow.dob) ??
                      (ow.dob && !dobValid(ow.dob)
                        ? "Enter a real date as MM/DD/YYYY"
                        : undefined)
                    }
                    placeholder="MM/DD/YYYY"
                  />
                </Grid>
                {b.owners.length > 1 && (
                  <button
                    onClick={() =>
                      updateDraft((d) => ({
                        ...d,
                        business: {
                          ...d.business,
                          owners: d.business.owners.filter(
                            (x) => x.id !== ow.id,
                          ),
                        },
                      }))
                    }
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" /> Remove owner
                  </button>
                )}
              </fieldset>
            );
          })}
          <button
            onClick={() =>
              updateDraft((d) => ({
                ...d,
                business: {
                  ...d.business,
                  owners: [...d.business.owners, blankOwner()],
                },
              }))
            }
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <Plus className="h-4 w-4" /> Add owner
          </button>
        </div>
        <div className="mt-6">
          <Field
            label="Affiliated or related businesses"
            kind="textarea"
            value={b.affiliates}
            onChange={set("affiliates")}
            placeholder="Other entities the owners control, shared guarantees, intercompany loans…"
          />
        </div>
      </Section>
    </div>
  );
}
