import {
  BarChart3,
  Boxes,
  Globe2,
  ImageIcon,
  LineChart,
  Link2,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

export const nav = [
  { label: "Producto", href: "#producto" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Precios", href: "#precios" },
  { label: "Preguntas frecuentes", href: "#faq" },
];

export const heroStats = [
  { value: "+2,400", label: "vendedores conectados" },
  { value: "$48M+", label: "en ventas analizadas" },
  { value: "9 países", label: "de Mercado Libre" },
];

export const steps = [
  {
    number: "01",
    title: "Conecta tu cuenta",
    description:
      "Vincula tu cuenta de Mercado Libre en segundos vía OAuth. Nunca accedemos ni almacenamos tu contraseña.",
  },
  {
    number: "02",
    title: "Analizamos todo por ti",
    description:
      "Sincronizamos tus publicaciones, ventas, costos e inventario para calcular tu rentabilidad real al instante.",
  },
  {
    number: "03",
    title: "Optimiza con IA",
    description:
      "Genera títulos SEO, descripciones e infografías, y descubre qué nichos vale la pena atacar.",
  },
];

export const features = [
  {
    icon: Wallet,
    title: "Rentabilidad Real",
    description:
      "Calcula tu utilidad neta considerando comisiones, envíos, COGS e impuestos automáticamente.",
    span: "md:col-span-4",
    accent: "primary" as const,
  },
  {
    icon: Boxes,
    title: "Control de Inventario",
    description:
      "Diferencia entre stock FULL y bodega propia. Alertas cuando el stock alcance para menos de 7 días.",
    span: "md:col-span-4",
    accent: "primary" as const,
  },
  {
    icon: BarChart3,
    title: "Alertas de Costos",
    description:
      "Detecta automáticamente cuando los costos de envío superan el 20% del precio del producto.",
    span: "md:col-span-4",
    accent: "destructive" as const,
  },
  {
    icon: Link2,
    title: "Integración Directa",
    description:
      "Conecta tu cuenta de Mercado Libre y obtén datos en tiempo real de tus ventas, envíos y productos.",
    span: "md:col-span-8",
    accent: "image" as const,
  },
  {
    icon: Globe2,
    title: "Multi-País",
    description: "Soporte para toda Latinoamérica con conversión automática de moneda.",
    span: "md:col-span-4",
    accent: "gradient" as const,
  },
  {
    icon: Search,
    title: "Optimizador SEO con IA",
    description:
      "Extrae la intención de búsqueda real de tu categoría y genera títulos que sí venden.",
    span: "md:col-span-4",
    accent: "primary" as const,
  },
  {
    icon: LineChart,
    title: "Investigación de Nichos",
    description:
      "Veredicto estratégico de mercado: demanda, competencia y barreras de entrada antes de invertir.",
    span: "md:col-span-4",
    accent: "primary" as const,
  },
  {
    icon: ImageIcon,
    title: "Generador de Infografías",
    description:
      "Crea descripciones e infografías de nivel profesional con IA en minutos, sin diseñador.",
    span: "md:col-span-4",
    accent: "secondary" as const,
  },
  {
    icon: Receipt,
    title: "Gestión de Costos y Gastos",
    description:
      "Asigna el COGS de cada producto, registra gastos operativos fijos y variables, e impuestos personalizados — con carga masiva por CSV y todo en un panel dedicado.",
    span: "md:col-span-12",
    accent: "primary" as const,
  },
];

export const pricingPlans = [
  {
    name: "Emprendedor",
    price: "$19",
    period: "/mes",
    description: "Para quienes están empezando a vender en serio.",
    highlighted: false,
    features: [
      "1 cuenta de Mercado Libre",
      "Calculadora de rentabilidad",
      "Control de inventario básico",
      "50 créditos de IA / mes",
      "Soporte por correo",
    ],
    cta: "Empezar ahora",
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mes",
    description: "Para vendedores establecidos que quieren escalar.",
    highlighted: true,
    features: [
      "Todo lo del plan Emprendedor",
      "3 cuentas de Mercado Libre",
      "Optimizador SEO + investigación de nichos",
      "300 créditos de IA / mes",
      "Alertas de costos en tiempo real",
      "Soporte prioritario",
    ],
    cta: "Empezar ahora",
  },
  {
    name: "Elite",
    price: "$99",
    period: "/mes",
    description: "Para equipos y catálogos grandes multi-país.",
    highlighted: false,
    features: [
      "Todo lo del plan Pro",
      "Cuentas ilimitadas de Mercado Libre",
      "Generador de infografías con IA",
      "1,200 créditos de IA / mes",
      "Soporte para toda Latinoamérica",
      "Onboarding dedicado",
    ],
    cta: "Hablar con ventas",
  },
];

export const faqItems = [
  {
    question: "¿Cómo se conecta MeliBoost a mi cuenta de Mercado Libre?",
    answer:
      "Usamos el flujo oficial de OAuth de Mercado Libre. Nunca vemos ni almacenamos tu contraseña: solo recibimos un token de acceso que puedes revocar cuando quieras desde tu cuenta de Mercado Libre.",
  },
  {
    question: "¿Qué datos de mi cuenta pueden ver?",
    answer:
      "Solo los datos necesarios para calcular tu rentabilidad e inventario: publicaciones, precios, ventas, envíos y comisiones. No accedemos a tu información de pago ni a datos personales de tus compradores.",
  },
  {
    question: "¿Qué son los créditos de IA?",
    answer:
      "Cada generación de descripción, título SEO o infografía consume créditos. Cada plan incluye una cantidad mensual y puedes comprar créditos adicionales sin cambiar de plan.",
  },
  {
    question: "¿Puedo cancelar cuando quiera?",
    answer:
      "Sí. Puedes cancelar tu suscripción en cualquier momento desde tu cuenta y mantendrás acceso hasta el final del período que ya pagaste.",
  },
  {
    question: "¿Funciona en todos los países de Mercado Libre?",
    answer:
      "Sí, soportamos los principales sitios de Mercado Libre en Latinoamérica: Colombia, México, Argentina, Brasil, Chile, Perú, Ecuador, Uruguay y Venezuela, con conversión automática de moneda.",
  },
];

export const trustPoints = [
  { icon: ShieldCheck, label: "Datos seguros y encriptados" },
  { icon: Sparkles, label: "IA aplicada a tu rentabilidad real" },
];
