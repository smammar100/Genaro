import { EmptyState, Page } from "@/components/polaris";

/**
 * Scratch route for comparing design variations (see
 * .claude/skills/prototype): each feature's variations replace this page
 * while they're being chosen.
 */
export default function PrototypePage() {
  return (
    <Page title="Prototype">
      <EmptyState heading="No prototype in progress">
        <p>Variations for the next feature appear here while they&apos;re being chosen.</p>
      </EmptyState>
    </Page>
  );
}
