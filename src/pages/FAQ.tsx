import PKRHeader from "@/components/PKRHeader";
import PKRFooter from "@/components/PKRFooter";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const FAQ = () => {
  const { isUrdu } = useLanguage();

  const faqs = [
    {
      question: isUrdu ? "PKRSC کیا ہے؟" : "What is PKRSC?",
      answer: isUrdu
        ? "PKRSC (PKR Stable Coin) پاکستان کا پہلا PKR سے محفوظ سٹیبل کوائن ہے۔ یہ ایک ڈیجیٹل کرنسی ہے جو 1:1 کی نسبت سے پاکستانی روپے کے ساتھ محفوظ ہے، جو قیمت کی استحکام اور آسان لین دین فراہم کرتا ہے۔"
        : "PKRSC (PKR Stable Coin) is Pakistan's first PKR-backed stablecoin. It's a digital currency pegged 1:1 with the Pakistani Rupee, providing price stability and easy transactions.",
    },
    {
      question: isUrdu ? "PKRSC کیسے کام کرتا ہے؟" : "How does PKRSC work?",
      answer: isUrdu
        ? "PKRSC بلاک چین ٹیکنالوجی پر چلتا ہے۔ جب آپ PKR جمع کرتے ہیں، تو مساوی مقدار میں PKRSC ٹوکنز آپ کے والیٹ میں منٹ کر دیے جاتے ہیں۔ جب آپ چھڑاتے ہیں، تو ٹوکنز جل جاتے ہیں اور آپ کو PKR واپس مل جاتا ہے۔"
        : "PKRSC operates on blockchain technology. When you deposit PKR, equivalent PKRSC tokens are minted to your wallet. When you redeem, the tokens are burned and you receive PKR back.",
    },
    {
      question: isUrdu
        ? "ڈپازٹ اور نکلوانے کی فیس کیا ہے؟"
        : "What are the fees for deposits and withdrawals?",
      answer: isUrdu
        ? "ہم تمام ڈپازٹس اور نکلوانے پر 0.5% فیس وصول کرتے ہیں، جو روایتی بینکنگ سروسز سے نمایاں طور پر کم ہے۔"
        : "We charge a 0.5% fee on all deposits and withdrawals, which is significantly lower than traditional banking services.",
    },
    {
      question: isUrdu
        ? "کیا مجھے استعمال شروع کرنے کے لیے وائٹ لسٹ کرانا ضروری ہے؟"
        : "Do I need to be whitelisted to start using PKRSC?",
      answer: isUrdu
        ? "جی ہاں، پاکستانی مالیاتی ضوابط اور AML/KYC ضروریات کی تعمیل کے لیے، تمام صارفین کو PKRSC سروسز تک رسائی سے پہلے وائٹ لسٹنگ عمل مکمل کرنا ہوگا۔"
        : "Yes, to comply with Pakistani financial regulations and AML/KYC requirements, all users must complete our whitelisting process before accessing PKRSC services.",
    },
    {
      question: isUrdu
        ? "وائٹ لسٹنگ عمل میں کتنا وقت لگتا ہے؟"
        : "How long does the whitelisting process take?",
      answer: isUrdu
        ? "ہماری ٹیم عام طور پر 24-48 گھنٹوں میں وائٹ لسٹ درخواستوں کا جائزہ لیتی ہے۔ منظوری کے بعد، آپ فوری طور پر ٹریڈنگ شروع کر سکتے ہیں۔"
        : "Our team typically reviews whitelist applications within 24-48 hours. Once approved, you can start trading immediately.",
    },
    {
      question: isUrdu ? "PKRSC کتنا محفوظ ہے؟" : "How secure is PKRSC?",
      answer: isUrdu
        ? "ہم فوجی درجے کی انکرپشن، بلاک چین سیکورٹی، اور مکمل ریزرو شفافیت استعمال کرتے ہیں۔ تمام ٹرانزیکشنز آن چین تصدیق شدہ ہیں اور آپ کے فنڈز محفوظ والیٹس میں محفوظ ہیں۔"
        : "We use military-grade encryption, blockchain security, and full reserve transparency. All transactions are verified on-chain and your funds are secured in protected wallets.",
    },
    {
      question: isUrdu
        ? "کیا میں PKRSC کو دوسرے صارفین کو منتقل کر سکتا ہوں؟"
        : "Can I transfer PKRSC to other users?",
      answer: isUrdu
        ? "جی ہاں! ایک بار جب آپ کے والیٹ میں PKRSC ہو، تو آپ اسے کسی بھی دوسرے وائٹ لسٹ شدہ صارف کو فوری طور پر 24/7 منتقل کر سکتے ہیں۔"
        : "Yes! Once you have PKRSC in your wallet, you can transfer it to any other whitelisted user instantly, 24/7.",
    },
    {
      question: isUrdu
        ? "کیا PKRSC روایتی بینک اکاؤنٹ کی ضرورت ہے؟"
        : "Do I need a traditional bank account for PKRSC?",
      answer: isUrdu
        ? "ابتدائی ڈپازٹ کے لیے، آپ کو ہماری منظور شدہ چینلز کے ذریعے PKR جمع کرانے کی ضرورت ہے۔ تاہم، ایک بار جب آپ کے پاس PKRSC ہو، تو آپ اسے روایتی بینک اکاؤنٹ کی ضرورت کے بغیر استعمال کر سکتے ہیں۔"
        : "For initial deposits, you'll need to deposit PKR through our approved channels. However, once you have PKRSC, you can use it without needing a traditional bank account.",
    },
    {
      question: isUrdu
        ? "اگر میری والیٹ تک رسائی کھو جائے تو کیا ہوگا؟"
        : "What happens if I lose access to my wallet?",
      answer: isUrdu
        ? "آپ کا والیٹ آپ کی ذمہ داری ہے۔ ہمیشہ اپنے پرائیویٹ کیز یا سیڈ فریز کو محفوظ رکھیں۔ اگر آپ انہیں کھو دیتے ہیں، تو آپ کے فنڈز تک رسائی نہیں مل سکتی۔"
        : "Your wallet is your responsibility. Always keep your private keys or seed phrase secure. If you lose them, your funds may become inaccessible.",
    },
    {
      question: isUrdu
        ? "PKRSC کو کہاں استعمال کیا جا سکتا ہے؟"
        : "Where can PKRSC be used?",
      answer: isUrdu
        ? "PKRSC کو کسی بھی صارف کے درمیان لین دین کے لیے استعمال کیا جا سکتا ہے جو PKRSC قبول کرتے ہیں۔ یہ ڈیجیٹل ادائیگیوں، رقم کی منتقلی، اور آن لائن ٹرانزیکشنز کے لیے مثالی ہے۔"
        : "PKRSC can be used for peer-to-peer transactions between any users who accept PKRSC. It's ideal for digital payments, remittances, and online transactions.",
    },
    {
      question: isUrdu
        ? "کیا ٹرانزیکشنز کی کوئی حد ہے؟"
        : "Are there any transaction limits?",
      answer: isUrdu
        ? "ٹرانزیکشن کی حدیں آپ کی وائٹ لسٹ کی حیثیت اور تصدیقی سطح پر منحصر ہو سکتی ہیں۔ مخصوص حدود کے لیے ہماری ٹیم سے رابطہ کریں۔"
        : "Transaction limits may depend on your whitelist status and verification level. Contact our team for specific limits applicable to your account.",
    },
    {
      question: isUrdu
        ? "میں سپورٹ کے لیے کیسے رابطہ کر سکتا ہوں؟"
        : "How can I contact support?",
      answer: isUrdu
        ? "آپ team@pkrsc.org پر ای میل کے ذریعے ہم سے رابطہ کر سکتے ہیں۔ ہماری سپورٹ ٹیم آپ کی مدد کے لیے موجود ہے۔"
        : "You can reach us via email at team@pkrsc.org. Our support team is here to help you with any questions or issues.",
    },
  ];

  return (
    <div className="min-h-screen bg-crypto-dark">
      <PKRHeader />
      <main className="container px-4 py-16">
        {/* Header Section */}
        <div className={`text-center mb-12 ${isUrdu ? 'font-urdu' : ''}`}>
          <Badge className="mb-4 bg-crypto-green/10 text-crypto-green border-crypto-green/20">
            {isUrdu ? "عمومی سوالات" : "Frequently Asked Questions"}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {isUrdu ? "آپ کے سوالات کے جوابات" : "Your Questions Answered"}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {isUrdu
              ? "PKRSC کے بارے میں سب کچھ جاننے کے لیے ذیل میں عام سوالات تلاش کریں۔"
              : "Find answers to common questions about PKRSC and how to get started."}
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-crypto-dark border border-crypto-gray rounded-lg px-6"
              >
                <AccordionTrigger
                  className={`text-white hover:text-crypto-green ${
                    isUrdu ? "font-urdu text-right" : "text-left"
                  }`}
                >
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent
                  className={`text-gray-400 ${
                    isUrdu ? "font-urdu text-right" : "text-left"
                  }`}
                >
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact CTA */}
        <div
          className={`mt-16 text-center p-8 bg-gradient-to-r from-crypto-green/10 to-crypto-green/5 rounded-lg border border-crypto-green/20 ${
            isUrdu ? "font-urdu" : ""
          }`}
        >
          <h2 className="text-2xl font-bold text-white mb-4">
            {isUrdu ? "مزید سوالات ہیں؟" : "Still Have Questions?"}
          </h2>
          <p className="text-gray-400 mb-6">
            {isUrdu
              ? "ہم یہاں مدد کے لیے ہیں! ہم سے رابطہ کریں۔"
              : "We're here to help! Get in touch with our team."}
          </p>
          <a
            href="mailto:team@pkrsc.org"
            className="inline-block bg-crypto-green hover:bg-crypto-green/90 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            {isUrdu ? "ہم سے رابطہ کریں" : "Contact Us"}
          </a>
        </div>
      </main>
      <PKRFooter />
    </div>
  );
};

export default FAQ;
