import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WhitelistForm } from "./WhitelistForm";
import { Shield, CheckCircle2, Clock, Mail } from "lucide-react";

export default function WhitelistInfoSection() {
  const { language, isUrdu } = useLanguage();
  const t = translations[language];

  const steps = [
    {
      icon: Mail,
      title: t.whitelistStep1Title,
      description: t.whitelistStep1Desc,
    },
    {
      icon: Clock,
      title: t.whitelistStep2Title,
      description: t.whitelistStep2Desc,
    },
    {
      icon: CheckCircle2,
      title: t.whitelistStep3Title,
      description: t.whitelistStep3Desc,
    },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className={`text-center mb-12 ${isUrdu ? 'font-urdu' : ''}`}>
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-primary/10 rounded-full">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-primary font-semibold">{t.whitelistBadge}</span>
          </div>
          <h2 className={`text-4xl font-bold mb-4 ${isUrdu ? 'text-right' : ''}`}>
            {t.whitelistTitle}
          </h2>
          <p className={`text-xl text-muted-foreground max-w-3xl mx-auto ${isUrdu ? 'text-right' : ''}`}>
            {t.whitelistSubtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className={isUrdu ? 'font-urdu text-right' : ''}>
                  {t.whitelistWhyTitle}
                </CardTitle>
                <CardDescription className={isUrdu ? 'font-urdu text-right' : ''}>
                  {t.whitelistWhyDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className={`space-y-3 ${isUrdu ? 'font-urdu text-right' : ''}`}>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t.whitelistReason1}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t.whitelistReason2}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t.whitelistReason3}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t.whitelistReason4}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className={isUrdu ? 'font-urdu text-right' : ''}>
                  {t.whitelistProcessTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={index} className={`flex gap-4 ${isUrdu ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <step.icon className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <div className={isUrdu ? 'text-right' : ''}>
                        <h4 className={`font-semibold mb-1 ${isUrdu ? 'font-urdu' : ''}`}>
                          {step.title}
                        </h4>
                        <p className={`text-sm text-muted-foreground ${isUrdu ? 'font-urdu' : ''}`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className={isUrdu ? 'font-urdu text-right' : ''}>
                  {t.whitelistFormTitle}
                </CardTitle>
                <CardDescription className={isUrdu ? 'font-urdu text-right' : ''}>
                  {t.whitelistFormDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WhitelistForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
