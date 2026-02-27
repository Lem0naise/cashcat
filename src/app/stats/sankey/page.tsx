/**
 * /stats/sankey — Server Component entry point.
 *
 * This is intentionally thin: it applies the ProGate subscription check,
 * then delegates all interactive logic to SankeyPageClient.
 *
 * To UN-GATE this feature, simply remove the <ProGate> wrapper.
 */
import { ProGate } from '@/app/components/pro-gate';
import SankeyPageClient from './sankey-page-client';

export default function SankeyPage() {
    return (
        <ProGate
            featureName="Money Flow Diagram"
            featureDescription="See exactly where your money goes with an interactive Sankey flow diagram — income sources, spending groups, categories, and vendors in one beautiful visualization."
        >
            <SankeyPageClient />
        </ProGate>
    );
}
