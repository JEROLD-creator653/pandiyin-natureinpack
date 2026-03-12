import { motion, cubicBezier } from 'framer-motion';
import {
  Leaf,
  Heart,
  Sun,
  Users,
  Shield,
  Target,
  Eye,
  CheckCircle,
  Handshake,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import SEOHead from '@/components/SEOHead';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, ease: cubicBezier(0.22, 0.61, 0.36, 1) },
};

const coreValues = [
  {
    icon: Heart,
    title: 'Small-Batch Production',
    desc: 'Each product is handcrafted by experienced home cooks who bring decades of culinary expertise.',
  },
  {
    icon: Leaf,
    title: 'Clean Ingredients',
    desc: 'Locally sourced ingredients with no synthetic additives or preservatives.',
  },
  {
    icon: Sun,
    title: 'Heritage Methods',
    desc: 'Sun-drying and time-tested preparation techniques ensure optimal flavor and nutrition.',
  },
  {
    icon: Users,
    title: 'Community Partnership',
    desc: 'Supporting Tamil Nadu farmers, artisans, and women-led enterprises through direct sourcing.',
  },
];

const qualityStandards = [
  'FSSAI-certified production facilities',
  'Multi-point quality verification',
  'Food-grade packaging materials',
  'Batch traceability system',
  'Sustainable local farm sourcing',
  'Comprehensive hygiene protocols',
];

interface InfoCardProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

function InfoCard({ icon: Icon, title, children }: InfoCardProps) {
  return (
    <div className="p-8 rounded-xl bg-primary/5 border border-primary/10">
      <Icon className="h-10 w-10 text-primary mb-4" aria-hidden="true" />
      <h3 className="text-2xl font-display font-bold mb-4">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

export default function About() {
  return (
    <div className="container mx-auto px-4 pt-24 pb-20 max-w-5xl">
      <SEOHead
        title="About Us - PANDIYIN"
        description="Learn about PANDIYIN Nature In Pack — authentic homemade foods from Madurai, Tamil Nadu. Traditional recipes, clean ingredients, heritage methods."
      />
      {/* Hero */}
      <motion.section {...fadeUp} className="text-center mb-24">
        <Leaf className="h-16 w-16 mx-auto text-primary mb-6" aria-hidden="true" />
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold mb-6 tracking-tight">


          About Us
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Bringing the culinary heritage of Madurai to homes across India through thoughtfully crafted foods.
        </p>
      </motion.section>

      {/* Brand Story */}
      <motion.section {...fadeUp} className="mb-24">
        <div className="space-y-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-4xl mx-auto">
          <p>
            <span className="font-semibold text-foreground">PANDIYIN</span> was founded to honor the food traditions of Tamil Nadu. We create products that reflect generations of culinary wisdom, prepared with the same care our grandmothers brought to their kitchens. Every recipe follows time-tested methods that prioritize flavor, nutrition, and quality above convenience.
          </p>
          <p>
            Our approach is built on transparency and community. We work directly with local farmers and skilled artisans who bring deep expertise to each batch. From ingredient selection to final packaging, we maintain strict standards while supporting the people and practices that make our work possible.
          </p>
        </div>
      </motion.section>

      <Separator className="mb-24" />

      {/* Core Values */}
      <motion.section {...fadeUp} className="mb-24">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-14">
          What Defines Us
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {coreValues.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: cubicBezier(0.22, 0.61, 0.36, 1) }}
              className="p-6 md:p-8 rounded-xl bg-secondary/30 border border-border/60 hover:border-primary/30 transition-colors duration-300"
            >
              <item.icon className="h-9 w-9 text-primary mb-4" aria-hidden="true" />
              <h3 className="font-semibold text-lg md:text-xl mb-3 text-foreground">{item.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <Separator className="mb-24" />

      {/* Quality Standards */}
      <motion.section {...fadeUp} className="mb-24">
        <div className="flex items-center justify-center gap-3 mb-12">
          <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
          <h2 className="text-3xl md:text-4xl font-display font-bold">Quality Standards</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {qualityStandards.map((standard, i) => (
            <motion.div
              key={standard}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: cubicBezier(0.22, 0.61, 0.36, 1) }}
              className="flex items-start gap-3 p-5 rounded-lg bg-muted/30 border border-border/50"
            >
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-sm md:text-base font-medium text-foreground leading-relaxed">
                {standard}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <Separator className="mb-24" />

      {/* Customer Commitment */}
      <motion.section {...fadeUp} className="text-center max-w-3xl mx-auto">
        <Handshake className="h-12 w-12 mx-auto text-primary mb-6" aria-hidden="true" />
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-6">Our Commitment</h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
          We stand behind every product we make. If something doesn't meet your expectations, we want to know. Our commitment is to continuous improvement, transparency, and building lasting trust with the families we serve.
        </p>
      </motion.section>
    </div>
  );
}