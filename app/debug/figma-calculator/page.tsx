import { Text } from "@gravity-ui/uikit";
import { CalculatorPanel } from "@/features/calculator/ui";
import "./page.css";

export default function FigmaCalculatorPage() {
  return (
    <div className="figma-calculator-page">
      <section className="figma-calculator-page__content">
        <Text variant="display-1">Figma Calculator Preview</Text>
        <Text variant="body-2" color="secondary">
          Mini case from Figma node 4:4886 adapted to Gravity UI and project tokens.
        </Text>
        <CalculatorPanel />
      </section>
    </div>
  );
}
