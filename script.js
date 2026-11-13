if (typeof supabase === "undefined" || typeof SB_URL === "undefined") {
  throw new Error("Configuration Supabase manquante.");
}
var db = supabase.createClient(SB_URL, SB_KEY);

var COUNTRIES = "Afrique du Sud,Algérie,Angola,Bénin,Botswana,Burkina Faso,Burundi,Cameroun,Cap-Vert,République centrafricaine,Comores,République du Congo,République démocratique du Congo,Côte d’Ivoire,Djibouti,Égypte,Érythrée,Eswatini,Éthiopie,Gabon,Gambie,Ghana,Guinée,Guinée-Bissau,Guinée équatoriale,Kenya,Lesotho,Liberia,Libye,Madagascar,Malawi,Mali,Maroc,Maurice,Mauritanie,Mozambique,Namibie,Niger,Nigéria,Ouganda,Rwanda,Sao Tomé-et-Principe,Sénégal,Seychelles,Sierra Leone,Somalie,Soudan,Soudan du Sud,Tanzanie,Tchad,Togo,Tunisie,Zambie,Zimbabwe".split(",");

var CUR = {
  "Afrique du Sud": "ZAR", "Algérie": "DZD", "Angola": "AOA", "Bénin": "XOF", "Botswana": "BWP",
  "Burkina Faso": "XOF", "Burundi": "BIF", "Cameroun": "XAF", "Cap-Vert": "CVE",
  "République centrafricaine": "XAF", "Comores": "KMF", "République du Congo": "XAF",
  "République démocratique du Congo": "USD", "Côte d’Ivoire": "XOF", "Djibouti": "DJF",
  "Égypte": "EGP", "Érythrée": "ERN", "Eswatini": "SZL", "Éthiopie": "ETB", "Gabon": "XAF",
  "Gambie": "GMD", "Ghana": "GHS", "Guinée": "GNF", "Guinée-Bissau": "XOF", "Guinée équatoriale": "XAF",
  "Kenya": "KES", "Lesotho": "LSL", "Liberia": "USD", "Libye": "LYD", "Madagascar": "MGA",
  "Malawi": "MWK", "Mali": "XOF", "Maroc": "MAD", "Maurice": "MUR", "Mauritanie": "MRU",
  "Mozambique": "MZN", "Namibie": "NAD", "Niger": "XOF", "Nigéria": "NGN", "Ouganda": "UGX",
  "Rwanda": "RWF", "Sao Tomé-et-Principe": "STN", "Sénégal": "XOF", "Seychelles": "SCR",
  "Sierra Leone": "SLE", "Somalie": "SOS", "Soudan": "SDG", "Soudan du Sud": "SSP",
  "Tanzanie": "TZS", "Tchad": "XAF", "Togo": "XOF", "Tunisie": "TND", "Zambie": "ZMW", "Zimbabwe": "ZWG"
};

var CARD = "Carte bancaire (Visa / Mastercard)";
var BANK_TRANSFER = "Virement bancaire direct";

var PM_LIST = [
  [BANK_TRANSFER, "Transfert bancaire direct (RIB / IBAN)"],
  ["Wave", "Sénégal, Côte d’Ivoire, Mali, Burkina Faso"],
  ["Orange Money", "Afrique de l'Ouest et Centrale"],
  ["MTN Mobile Money", "Cameroun, Bénin, Ghana, Côte d’Ivoire, etc."],
  ["Moov Money", "Bénin, Togo, Côte d’Ivoire, Mali, etc."],
  ["Airtel Money", "Kenya, Ouganda, Tanzanie, Zambie, etc."],
  ["M-Pesa", "Kenya, Tanzanie, RDC, Mozambique"],
  ["Free Money", "Sénégal"],
  ["Wizall Money", "Sénégal, UEMOA"],
  ["Inwi Money", "Maroc"],
  ["Morocco Pay", "Maroc"],
  ["Fawry / Vodafone Cash", "Égypte"],
  [CARD, "Paiement en ligne sécurisé"]
];

var TR = {
  fr:{
    tagline:"Plateforme E-Commerce", aiTitle:"Xelo IA", aiIntro:"Xelo IA vous aide à développer vos ventes, analyser vos commandes et gérer votre boutique.", aiPlaceholder:"Écrivez votre question…", aiSend:"Envoyer", aiThinking:"Analyse en cours…", aiGreeting:"Bonjour ! Je suis Xelo IA, votre coach commercial. Je peux vous aider à développer votre boutique.", clientSpace:"Voir la Boutique", vendorSpace:"Espace Vendeur", availableProducts:"Catalogue des Articles", add:"Ajouter", outOfStock:"Rupture", cartTitle:"Mon Panier", emptyCart:"Votre panier est vide", total:"Total", placeOrder:"Valider et Payer", clientDetails:"Coordonnées", pay:"Mode de paiement", mapLinkOpt:"Lien de localisation GPS (ex: Google Maps, facultatif)",
    loading:"Chargement...", createShop:"Créer ma boutique", owner:"Propriétaire", location:"Localisation", enterShop:"Entrer dans la Boutique", country:"Pays", currency:"Devise", shareShop:"Partager cette boutique", homePage:"Voir la page d’accueil", noProducts:"Aucun article pour le moment.",
    fullName:"Nom & Prénom", shopName:"Nom de la boutique", phone:"Téléphone / WhatsApp", address:"Adresse", payHint:"Le vendeur vous indiquera comment procéder.",
    createShopTitle:"Créer sa Boutique — 1 mois d’essai", loginTitle:"Connexion Vendeur", whatsappNumber:"Numéro WhatsApp", idDocLabel:"Pièce d’identité (obligatoire pour validation)", idSaved:"Pièce enregistrée", email:"Email", password:"Mot de passe", hide:"Masquer", show:"Voir", pleaseWait:"Veuillez patienter...", createShopBtn:"Créer ma boutique", loginBtn:"Se connecter", noAccount:"Pas de compte ? Créer ma boutique", hasAccount:"Déjà un compte ? Se connecter",
    logout:"Connexion / Déconnexion", shareLinkTitle:"Mon lien à partager aux clients", shareLinkDesc:"Diffusez ce lien sur vos réseaux sociaux ou envoyez-le directement à vos acheteurs.", linkCopied:"Lien copié", copyLink:"Copier le lien", shareWa:"Partager sur WhatsApp", generatingLink:"Génération du lien en cours...",
    subTitle:"Gérer mon Abonnement", subSub:"Changez de formule à tout moment", recommended:"Recommandé", perMonth:"/ mois", currentPlan:"Formule Actuelle", choosePlan:"Choisir",
    myShop:"Ma boutique", addProduct:"Ajouter un article", prodName:"Nom", price:"Prix", desc:"Description", photo:"Photo", publishProd:"Publier l’article", myProducts:"Mes articles", delete:"Supprimer",
    terms:"Conditions d'utilisation", privacy:"Confidentialité", cookies:"Cookies", refunds:"Remboursements", legal:"Mentions légales",
    chooseFile:"Aucun fichier choisi", browse:"Parcourir",
    idVerificationTitle:"Vérification d’identité", idVerificationDesc:"Votre pièce d'identité est obligatoire pour que votre boutique soit visible par les clients.", idConsentText:"Je consens expressément à ce que ma pièce d’identité soit traitée pour vérifier mon identité (confidentialité). (obligatoire)", submitIdBtn:"Envoyer mon document d'identité",
    ordersTitle:"Commandes & Suivi", ordersSubtitle:"Suivez en temps réel les commandes et leur statut pour chaque client.", noOrders:"Aucune commande pour le moment.",
    refundPolicyLabel:"Politique de retour et remboursement (affichée aux clients)",
    paymentMethodsTitle:"Modes de paiement acceptés (Optionnel)", selectPaymentMethod:"+ Ajouter un moyen de paiement...", addPaymentBtn:"Ajouter", removeBtn:"Retirer", paymentHelpText:"Ajoutez vos coordonnées bancaires ou Mobile Money pour que les clients puissent effectuer le virement directement.",
    planStarter:"Starter", planPro:"Pro", planPremium:"Premium",
    subStarter:"Pour débuter en douceur", subPro:"Pour les vendeurs réguliers", subPremium:"Pour maximiser ses ventes",
    f1:"Jusqu'à 10 articles", f2:"Gestion des commandes", f3:"Paiement optionnel",
    f4:"Articles illimités", f5:"Tableau de bord & Visites", f6:"Gestion des stocks", f7:"Badge Vendeur Vérifié",
    f8:"Tout ce qui est dans Pro", f9:"Mise en avant des produits", f10:"Boutique WhatsApp Direct", f11:"Support Prioritaire 24/7",
    f12:"IA Pro : questions sur ventes, commandes et stocks", f13:"Analyses et recommandations personnalisées par l’IA", f14:"Conseils pour améliorer la boutique",
    f15:"IA Premium : création et optimisation de fiches produits", f16:"Actions sur la boutique après votre confirmation", f17:"Aide avancée à la gestion de l’inventaire", f18:"Automatisations et tâches répétitives assistées par IA",
    orderSuccessTitle:"Commande enregistrée !", orderSuccessDesc:"Votre commande est enregistrée. Le paiement reste à confirmer directement avec le vendeur.",
    trackingCodeLabel:"Votre Code de Suivi Unique :", copy:"Copier", copied:"Copié !", sendOrderWa:"Envoyer la confirmation au vendeur sur WhatsApp", close:"Fermer",
    client:"Client", status:"Statut", statusPending:"Paiement à confirmer / En attente", statusProcessing:"En cours de préparation / expédition", statusCompleted:"Livrée / Terminée",
    inStockLabel:"En stock", outOfStockLabel:"En rupture",
    cardModalTitle:"Paiement Sécurisé par Carte Bancaire", cardModalDesc:"Entrez les informations de votre carte pour régler votre commande en toute sécurité.", cardNumber:"Numéro de carte", cardExp:"Expiration", cardCvv:"CVV", paySecurely:"Payer en ligne", cancel:"Annuler",
    statVisits:"Visites du site", statRevenue:"Chiffre d'affaires", statOrders:"Commandes reçues",
    viewSub:"Voir abonnement",
    navHome:"Vue d'ensemble", navInventory:"Inventaire & Articles", navOrders:"Commandes", navSettings:"Paramètres Boutique", navAccount:"Mon compte", accountInfoTitle:"Informations du compte", accountInfoDesc:"Ces informations sont personnelles et indépendantes des paramètres de votre boutique.", accountEmail:"Adresse e-mail du compte", noAccountEmail:"Aucune adresse e-mail associée", accountEmailReadonly:"L'adresse e-mail est liée à votre authentification et ne peut pas être modifiée ici.", accountPhone:"Numéro de téléphone du compte", accountPhoneHint:"Format international conseillé. Ce numéro sert de contact de compte ; il ne modifie ni le WhatsApp public de la boutique ni le numéro de connexion WhatsApp.", saveAccountPhone:"Enregistrer le numéro", accountPhoneSaved:"Numéro du compte mis à jour. Le WhatsApp public de la boutique n'a pas été modifié.",
    securityTitle:"Sécurité du compte", currentPassword:"Mot de passe actuel", newPassword:"Nouveau mot de passe", confirmPassword:"Confirmer le nouveau mot de passe", changePasswordBtn:"Modifier le mot de passe", passwordChanged:"Mot de passe modifié avec succès.", passwordMismatch:"Les deux nouveaux mots de passe ne correspondent pas.", passwordTooShort:"Le nouveau mot de passe doit contenir au moins 8 caractères.", passwordChangeError:"Impossible de modifier le mot de passe. Vérifiez votre mot de passe actuel et réessayez.",
    dangerZoneTitle:"Zone de Danger — Abonnement & Compte", dangerZoneDesc:"Vous pouvez résilier votre abonnement ou supprimer définitivement votre compte.",
    cancelSubBtn:"Résilier l'abonnement", deleteAccountBtn:"Supprimer définitivement mon compte"
  },
  en:{
    tagline:"E-Commerce Platform", aiTitle:"Xelo IA", aiIntro:"Xelo IA helps you grow sales, analyze orders and manage your shop.", aiPlaceholder:"Write your question…", aiSend:"Send", aiThinking:"Thinking…", aiGreeting:"Hello! I am Xelo IA, your business coach. I can help you grow your shop.", clientSpace:"View Shop", vendorSpace:"Vendor Area", availableProducts:"Products", add:"Add", outOfStock:"Out of Stock", cartTitle:"Cart", emptyCart:"Empty cart", total:"Total", placeOrder:"Checkout & Pay", clientDetails:"Details", pay:"Payment method", mapLinkOpt:"GPS Location link (optional)",
    loading:"Loading...", createShop:"Create my shop", owner:"Owner", location:"Location", enterShop:"Enter Shop", country:"Country", currency:"Currency", shareShop:"Share shop", homePage:"Home page", noProducts:"No products yet.",
    fullName:"Full Name", shopName:"Shop Name", phone:"Phone / WhatsApp", address:"Address", payHint:"The vendor will instruct you.",
    createShopTitle:"Create Shop — 1 month trial", loginTitle:"Vendor Login", whatsappNumber:"WhatsApp Number", idDocLabel:"ID Document (required)", idSaved:"ID Saved", email:"Email", password:"Password", hide:"Hide", show:"Show", pleaseWait:"Please wait...", createShopBtn:"Create Shop", loginBtn:"Login", noAccount:"No account? Create shop", hasAccount:"Already have an account? Login",
    logout:"Logout", shareLinkTitle:"Share Link", shareLinkDesc:"Share this link with your customers.", linkCopied:"Link copied", copyLink:"Copy link", shareWa:"Share on WhatsApp", generatingLink:"Generating link...",
    subTitle:"Manage Subscription", subSub:"Change plan anytime", recommended:"Recommended", perMonth:"/ mo", currentPlan:"Current Plan", choosePlan:"Choose",
    myShop:"My Shop", addProduct:"Add Product", prodName:"Name", price:"Price", desc:"Description", photo:"Photo", publishProd:"Publish Product", myProducts:"My Products", delete:"Delete",
    terms:"Terms of Use", privacy:"Privacy Policy", cookies:"Cookies", refunds:"Refunds", legal:"Legal Notice",
    chooseFile:"No file chosen", browse:"Browse",
    idVerificationTitle:"Identity Verification", idVerificationDesc:"Your ID document is required for your shop to be visible.", idConsentText:"I expressly consent to my ID document being processed for identity verification (confidentiality). (required)", submitIdBtn:"Submit my ID document",
    ordersTitle:"Orders & Tracking", ordersSubtitle:"Track orders and status in real-time.", noOrders:"No orders yet.",
    refundPolicyLabel:"Return and refund policy (displayed to customers)",
    paymentMethodsTitle:"Accepted payment methods (Optional)", selectPaymentMethod:"+ Add a payment method...", addPaymentBtn:"Add", removeBtn:"Remove", paymentHelpText:"Add your bank or mobile money info for direct client transfers.",
    planStarter:"Starter", planPro:"Pro", planPremium:"Premium",
    subStarter:"To start smoothly", subPro:"For regular vendors", subPremium:"To maximize sales",
    f1:"Up to 10 products", f2:"Order management", f3:"Optional payment",
    f4:"Unlimited products", f5:"Dashboard & Visits", f6:"Inventory management", f7:"Verified Vendor Badge",
    f8:"Everything in Pro", f9:"Product promotion", f10:"Direct WhatsApp Button", f11:"Priority Support 24/7",
    f12:"Pro AI: answers about sales, orders and stock", f13:"AI insights and personalized recommendations", f14:"Tips to improve your shop",
    f15:"Premium AI: create and optimize product listings", f16:"Shop changes after your confirmation", f17:"Advanced inventory assistance", f18:"AI-assisted workflows and repetitive tasks",
    orderSuccessTitle:"Order registered!", orderSuccessDesc:"Your order has been registered. Payment must still be confirmed directly with the seller.",
    trackingCodeLabel:"Your Unique Tracking Code:", copy:"Copy", copied:"Copied!", sendOrderWa:"Send order to vendor on WhatsApp", close:"Close",
    client:"Client", status:"Status", statusPending:"Payment to be confirmed / Pending", statusProcessing:"Processing / Shipping", statusCompleted:"Delivered / Completed",
    inStockLabel:"In Stock", outOfStockLabel:"Out of Stock",
    cardModalTitle:"Secure Credit Card Payment", cardModalDesc:"Enter your card details to securely pay for your order.", cardNumber:"Card Number", cardExp:"Expiration", cardCvv:"CVV", paySecurely:"Pay Online", cancel:"Cancel",
    statVisits:"Site Visits", statRevenue:"Total Revenue", statOrders:"Orders Received",
    viewSub:"View subscription",
    navHome:"Overview", navInventory:"Inventory & Products", navOrders:"Orders", navSettings:"Shop Settings", navAccount:"My Account", accountInfoTitle:"Account information", accountInfoDesc:"These personal details are separate from your shop settings.", accountEmail:"Account email address", noAccountEmail:"No email address linked", accountEmailReadonly:"Your email is linked to authentication and cannot be changed here.", accountPhone:"Account phone number", accountPhoneHint:"Use international format. This is your account contact number; it does not change the shop's public WhatsApp number or your WhatsApp login number.", saveAccountPhone:"Save phone number", accountPhoneSaved:"Account phone number updated. The shop's public WhatsApp number was not changed.",
    securityTitle:"Account security", currentPassword:"Current password", newPassword:"New password", confirmPassword:"Confirm new password", changePasswordBtn:"Change password", passwordChanged:"Password changed successfully.", passwordMismatch:"The new passwords do not match.", passwordTooShort:"The new password must contain at least 8 characters.", passwordChangeError:"Could not change the password. Check your current password and try again.",
    dangerZoneTitle:"Danger Zone — Subscription & Account", dangerZoneDesc:"You can cancel your subscription or permanently delete your account.",
    cancelSubBtn:"Cancel subscription", deleteAccountBtn:"Delete my account permanently"
  },
  es:{
    tagline:"Plataforma E-Commerce", aiTitle:"Xelo IA", aiIntro:"Xelo IA te ayuda a aumentar las ventas, analizar pedidos y gestionar tu tienda.", aiPlaceholder:"Escribe tu pregunta…", aiSend:"Enviar", aiThinking:"Analizando…", aiGreeting:"¡Hola! Soy Xelo IA, tu asesor comercial. Puedo ayudarte a hacer crecer tu tienda.", clientSpace:"Ver Tienda", vendorSpace:"Área Vendedor", availableProducts:"Productos", add:"Añadir", outOfStock:"Agotado", cartTitle:"Cesta", emptyCart:"Cesta vacía", total:"Total", placeOrder:"Pagar y Pedir", clientDetails:"Detalles", pay:"Método de pago", mapLinkOpt:"Enlace de ubicación GPS (opcional)",
    loading:"Cargando...", createShop:"Crear tienda", owner:"Propietario", location:"Ubicación", enterShop:"Entrar a la tienda", country:"País", currency:"Moneda", shareShop:"Compartir", homePage:"Inicio", noProducts:"No hay productos.",
    fullName:"Nombre y Apellido", shopName:"Nombre de tienda", phone:"Teléfono / WhatsApp", address:"Dirección", payHint:"El vendedor te indicará el pago.",
    createShopTitle:"Crear Tienda — 1 mes de prueba", loginTitle:"Acceso Vendedor", whatsappNumber:"Número WhatsApp", idDocLabel:"Documento de identidad", idSaved:"Documento guardado", email:"Correo", password:"Contraseña", hide:"Ocultar", show:"Ver", pleaseWait:"Espere...", createShopBtn:"Crear Tienda", loginBtn:"Iniciar sesión", noAccount:"¿Sin cuenta? Crear tienda", hasAccount:"¿Ya tienes cuenta? Entrar",
    logout:"Cerrar sesión", shareLinkTitle:"Enlace para compartir", shareLinkDesc:"Comparte este enlace con tus clientes.", linkCopied:"Copiado", copyLink:"Copiar enlace", shareWa:"Compartir en WhatsApp", generatingLink:"Generando enlace...",
    subTitle:"Suscripción", subSub:"Cambia de plan cuando quieras", recommended:"Recomendado", perMonth:"/ mes", currentPlan:"Plan actual", choosePlan:"Elegir",
    myShop:"Mi tienda", addProduct:"Añadir producto", prodName:"Nombre", price:"Precio", desc:"Descripción", photo:"Foto", publishProd:"Publicar producto", myProducts:"Mis productos", delete:"Eliminar",
    terms:"Condiciones de uso", privacy:"Privacidad", cookies:"Cookies", refunds:"Reembolsos", legal:"Aviso legal",
    chooseFile:"Ningún archivo seleccionado", browse:"Examinar",
    idVerificationTitle:"Verificación de identidad", idVerificationDesc:"Su documento de identidad es obligatorio para que su tienda sea visible.", idConsentText:"Consiento expresamente que mi documento de identidad sea procesado para verificar mi identidad (confidencialidad). (obligatorio)", submitIdBtn:"Enviar mi documento de identidad",
    ordersTitle:"Pedidos y Seguimiento", ordersSubtitle:"Sigue los pedidos en tiempo real.", noOrders:"No hay pedidos por el momento.",
    refundPolicyLabel:"Política de devolución y reembolso (mostrada a los clientes)",
    paymentMethodsTitle:"Métodos de pago aceptados (Opcional)", selectPaymentMethod:"+ Agregar un método de pago...", addPaymentBtn:"Agregar", removeBtn:"Eliminar", paymentHelpText:"Agrega tus datos bancarios para transferencias directas.",
    planStarter:"Starter", planPro:"Pro", planPremium:"Premium",
    subStarter:"Para empezar suavemente", subPro:"Para vendedores regulares", subPremium:"Para maximizar ventas",
    f1:"Hasta 10 productos", f2:"Gestión de pedidos", f3:"Pago opcional",
    f4:"Productos ilimitados", f5:"Panel y visitas", f6:"Control de inventario", f7:"Insignia de vendedor verificado",
    f12:"IA Pro: respuestas sobre ventas, pedidos y stock", f13:"Análisis y recomendaciones personalizadas", f14:"Consejos para mejorar la tienda",
    f15:"IA Premium: creación y optimización de productos", f16:"Cambios en la tienda con tu confirmación", f17:"Asistencia avanzada de inventario", f18:"Automatización de tareas repetitivas con IA",
    f8:"Todo lo de Pro", f9:"Promoción de productos", f10:"Botón directo WhatsApp", f11:"Soporte prioritario 24/7",
    orderSuccessTitle:"¡Pedido registrado!", orderSuccessDesc:"Tu pedido está registrado. El pago aún debe confirmarse directamente con el vendedor.",
    trackingCodeLabel:"Tu Código de Seguimiento Único:", copy:"Copiar", copied:"¡Copiado!", sendOrderWa:"Enviar pedido al vendedor por WhatsApp", close:"Cerrar",
    client:"Cliente", status:"Estado", statusPending:"Pago por confirmar / Pendiente", statusProcessing:"En preparación", statusCompleted:"Entregado",
    inStockLabel:"En Stock", outOfStockLabel:"Agotado",
    cardModalTitle:"Pago Seguro con Tarjeta", cardModalDesc:"Introduce los datos de tu tarjeta para pagar tu pedido de forma segura.", cardNumber:"Número de tarjeta", cardExp:"Expiración", cardCvv:"CVV", paySecurely:"Pagar online", cancel:"Cancelar",
    statVisits:"Visitas", statRevenue:"Ingresos totales", statOrders:"Pedidos recibidos",
    viewSub:"Ver suscripción",
    navHome:"Resumen", navInventory:"Inventario y Productos", navOrders:"Pedidos", navSettings:"Ajustes de Tienda", navAccount:"Mi cuenta", accountInfoTitle:"Información de la cuenta", accountInfoDesc:"Estos datos personales son independientes de la configuración de tu tienda.", accountEmail:"Correo electrónico de la cuenta", noAccountEmail:"No hay correo asociado", accountEmailReadonly:"El correo está vinculado a tu autenticación y no se puede cambiar aquí.", accountPhone:"Teléfono de la cuenta", accountPhoneHint:"Usa el formato internacional. Es el teléfono de contacto de tu cuenta; no cambia el WhatsApp público de la tienda ni el número para iniciar sesión.", saveAccountPhone:"Guardar número", accountPhoneSaved:"Número de cuenta actualizado. El WhatsApp público de la tienda no ha cambiado.",
    dangerZoneTitle:"Zona de Peligro — Suscripción y Cuenta", dangerZoneDesc:"Puede cancelar su suscripción o eliminar su cuenta permanentemente.",
    cancelSubBtn:"Cancelar suscripción", deleteAccountBtn:"Eliminar mi cuenta permanentemente"
  },
  ar:{
    tagline:"منصة التجارة الإلكترونية", aiTitle:"Xelo IA", aiIntro:"يساعدك Xelo IA على زيادة المبيعات وتحليل الطلبات وإدارة متجرك.", aiPlaceholder:"اكتب سؤالك…", aiSend:"إرسال", aiThinking:"جارٍ التحليل…", aiGreeting:"مرحباً! أنا Xelo IA، مستشارك التجاري لمساعدتك على تنمية متجرك.", clientSpace:"عرض المتجر", vendorSpace:"مساحة البائع", availableProducts:"المنتجات", add:"إضافة", outOfStock:"نفذت الكمية", cartTitle:"السلة", emptyCart:"السلة فارغة", total:"المجموع", placeOrder:"الدفع وإتمام الطلب", clientDetails:"التفاصيل", pay:"طريقة الدفع", mapLinkOpt:"رابط الموقع الجغرافي (اختياري)",
    loading:"جاري التحميل...", createShop:"إنشاء متجري", owner:"المالك", location:"الموقع", enterShop:"دخول المتجر", country:"الدولة", currency:"العملة", shareShop:"مشاركة المتجر", homePage:"الصفحة الرئيسية", noProducts:"لا توجد منتجات.",
    fullName:"الاسم الكامل", shopName:"اسم المتجر", phone:"الهاتف / واتساب", address:"العنوان", payHint:"سيقوم البائع بتوجيهك.",
    createShopTitle:"إنشاء متجر — تجربة شهر", loginTitle:"تسجيل دخول البائع", whatsappNumber:"رقم الواتساب", idDocLabel:"هوية شخصية مطلوبة", idSaved:"تم حفظ الهوية", email:"البريد الإلكتروني", password:"كلمة المرور", hide:"إخفاء", show:"إظهار", pleaseWait:"يرجى الانتظار...", createShopBtn:"إنشاء متجري", loginBtn:"تسجيل الدخول", noAccount:"ليس لديك حساب؟ إنشاء متجر", hasAccount:"لديك حساب بالفعل؟ تسجيل الدخول",
    logout:"تسجيل الخروج", shareLinkTitle:"رابط المشاركة", shareLinkDesc:"شارك هذا الرابط مع عملائك.", linkCopied:"تم النسخ", copyLink:"نسخ الرابط", shareWa:"مشاركة عبر واتساب", generatingLink:"جاري إنشاء الرابط...",
    subTitle:"إدارة الاشتراك", subSub:"غير خطتك في أي وقت", recommended:"موصى به", perMonth:"/ شهرياً", currentPlan:"الخطة الحالية", choosePlan:"اختيار",
    myShop:"متجري", addProduct:"إضافة منتج", prodName:"الاسم", price:"السعر", desc:"الوصف", photo:"الصورة", publishProd:"نشر المنتج", myProducts:"منتجاتي", delete:"حذف",
    terms:"شروط الاستخدام", privacy:"الخصوصية", cookies:"ملفات تعريف الارتباط", refunds:"الاسترداد", legal:"إشعار قانوني",
    chooseFile:"لم يتم اختيار ملف", browse:"تصفح",
    idVerificationTitle:"التحقق من الهوية", idVerificationDesc:"وثيقة هويتك مطلوبة حتى يظهر متجرك للعملاء.", idConsentText:"أوافق صراحة على معالجة وثيقة هويتي للتحقق من هويتي (سرية البيانات). (إجباري)", submitIdBtn:"إرسال وثيقة هويتي",
    ordersTitle:"الطلبات والمتابعة", ordersSubtitle:"تابع الطلبات وتحديثاتها في الوقت الفعلي.", noOrders:"لا توجد طلبات في الوقت الحالي.",
    refundPolicyLabel:"سياسة الإرجاع والاسترداد (تظهر للعملاء)",
    paymentMethodsTitle:"طرق الدفع المقبولة (اختياري)", selectPaymentMethod:"+ إضافة طريقة دفع...", addPaymentBtn:"إضافة", removeBtn:"إزالة", paymentHelpText:"أضف معلوماتك المصرفية للتحويل المباشر.",
    planStarter:"الأساسية (Starter)", planPro:"الاحترافية (Pro)", planPremium:"الممتازة (Premium)",
    subStarter:"للبداية بسلاسة", subPro:"للبائعين المنتظمين", subPremium:"لتعظيم مبيعاتك",
    f1:"ما يصل إلى 10 منتجات", f2:"إدارة الطلبات", f3:"دفع اختياري",
    f4:"منتجات غير محدودة", f5:"لوحة التحكم والزيارات", f6:"إدارة المخزون", f7:"شارة بائع موثق",
    f8:"كل ما في الاحترافية", f9:"تمييز المنتجات", f10:"زر واتساب مباشر", f11:"دعم فني أولوي 24/7",
    orderSuccessTitle:"تم تسجيل الطلب!", orderSuccessDesc:"تم تسجيل طلبك. يجب تأكيد الدفع مباشرةً مع البائع.",
    trackingCodeLabel:"رمز التتبع الفريد الخاص بك:", copy:"نسخ", copied:"تم النسخ!", sendOrderWa:"إرسال الطلب للبائع عبر واتساب", close:"إغلاق",
    client:"العميل", status:"الحالة", statusPending:"بانتظار تأكيد الدفع", statusProcessing:"قيد التجهيز / الشحن", statusCompleted:"تم التوصيل / مكتمل",
    inStockLabel:"متوفر", outOfStockLabel:"غير متوفر",
    cardModalTitle:"الدفع الآمن بالبطاقة البنكية", cardModalDesc:"أدخل معلومات بطاقتك لدفع قيمة الطلب بأمان تام.", cardNumber:"رقم البطاقة", cardExp:"تاريخ الانتهاء", cardCvv:"رمز الأمان", paySecurely:"ادفع الان", cancel:"إلغاء",
    statVisits:"الزيارات", statRevenue:"إجمالي الإيرادات", statOrders:"الطلبات المستلمة",
    viewSub:"عرض الاشتراك",
    navHome:"نظرة عامة", navInventory:"المخزون والمنتجات", navOrders:"الطلبات", navSettings:"إعدادات المتجر", navAccount:"حسابي", accountInfoTitle:"معلومات الحساب", accountInfoDesc:"هذه المعلومات الشخصية مستقلة عن إعدادات متجرك.", accountEmail:"البريد الإلكتروني للحساب", noAccountEmail:"لا يوجد بريد إلكتروني مرتبط", accountEmailReadonly:"البريد الإلكتروني مرتبط بتسجيل الدخول ولا يمكن تغييره هنا.", accountPhone:"رقم هاتف الحساب", accountPhoneHint:"استخدم التنسيق الدولي. هذا رقم الاتصال الخاص بحسابك ولا يغيّر رقم واتساب العام للمتجر أو رقم تسجيل الدخول.", saveAccountPhone:"حفظ الرقم", accountPhoneSaved:"تم تحديث رقم الحساب. لم يتغير رقم واتساب العام للمتجر.",
    dangerZoneTitle:"منطقة الخطر — الاشتراك والحساب", dangerZoneDesc:"يمكنك إلغاء اشتراكك أو حذف حسابك نهائياً.",
    cancelSubBtn:"إلغاء الاشتراك", deleteAccountBtn:"حذف حسابي نهائياً"
  }
};

function compress(file) {
  return new Promise(function (res) {
    var img = new Image(), u = URL.createObjectURL(file);
    img.onload = function () {
      var k = Math.min(1, 600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob(res, "image/jpeg", 0.75);
    };
    img.onerror = function () { URL.revokeObjectURL(u); res(null); };
    img.src = u;
  });
}

function rnd(n) {
  var a = "abcdefghjkmnpqrstuvwxyz23456789", b = new Uint8Array(n), s = "";
  crypto.getRandomValues(b);
  for (var i = 0; i < n; i++) s += a[b[i] % a.length];
  return s;
}

function norm(s) {
  if (!s.pm || typeof s.pm !== "object") s.pm = {};
  if (!s.products) s.products = [];
  if (!s.plan) s.plan = "pro";
  if (!s.refundPolicy) s.refundPolicy = "";
  if (!s.visits) s.visits = 0;
  return s;
}

function normalizeWhatsAppDigits(value, country) {
  var raw = String(value || "").trim();
  if (!raw) return "";
  var digits = raw.replace(/\D/g, "");
  var dialCodes = {
    "Afrique du Sud":"27","Algérie":"213","Angola":"244","Bénin":"229","Botswana":"267",
    "Burkina Faso":"226","Burundi":"257","Cameroun":"237","Cap-Vert":"238","République centrafricaine":"236",
    "Comores":"269","République du Congo":"242","République démocratique du Congo":"243","Côte d’Ivoire":"225",
    "Djibouti":"253","Égypte":"20","Érythrée":"291","Eswatini":"268","Éthiopie":"251","Gabon":"241",
    "Gambie":"220","Ghana":"233","Guinée":"224","Guinée-Bissau":"245","Guinée équatoriale":"240",
    "Kenya":"254","Lesotho":"266","Liberia":"231","Libye":"218","Madagascar":"261","Malawi":"265",
    "Mali":"223","Maroc":"212","Maurice":"230","Mauritanie":"222","Mozambique":"258","Namibie":"264",
    "Niger":"227","Nigéria":"234","Ouganda":"256","Rwanda":"250","Sao Tomé-et-Principe":"239",
    "Sénégal":"221","Seychelles":"248","Sierra Leone":"232","Somalie":"252","Soudan":"249",
    "Soudan du Sud":"211","Tanzanie":"255","Tchad":"235","Togo":"228","Tunisie":"216",
    "Zambie":"260","Zimbabwe":"263"
  };
  if (/^\s*00/.test(raw)) {
    digits = digits.slice(2);
  } else if (/^\s*\+/.test(raw)) {
    // Numéro déjà au format international.
  } else {
    var code = dialCodes[country];
    if (!code) return "";

    var nationalDigits = digits.replace(/^0+/, "");
    var alreadyInternational =
      digits.indexOf(code) === 0 &&
      digits.length >= code.length + 7 &&
      digits.length <= 15;

    if (!alreadyInternational) {
      if (nationalDigits.length < 7) return "";
      digits = code + nationalDigits;
    }
  }

  return /^\d{8,15}$/.test(digits) ? digits : "";
}

function blankShop() {
  return { name: "Ma Boutique", owner: "", country: "Sénégal", currency: "XOF", location: "Dakar", wa: "", pm: {}, products: [], plan: "pro", sid: "", verified: false, suspended: false, refundPolicy: "", visits: 0 };
}

// Formats acceptés pour la pièce d'identité
var ID_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

function app() {
  var tmr;
  var shopId = new URLSearchParams(location.search).get("b");
  return {
    remote: false, loading: !!shopId, remoteErr: "", checkoutBusy: false,
    aiInput: "", aiMessages: [], aiBusy: false, aiError: "", aiConversations: [], aiConversationId: "", aiHistoryBusy: false,
    passwordForm: { current: "", next: "", confirm: "" }, passwordBusy: false,
    accountEmail: "", accountPhone: "", accountPhoneDraft: "", accountSaving: false, accountMessage: "",
    ready: false, authed: false, uid: "", busy: false, imgBusy: false, deleting: false,
    modal: "", showPw: false, authMode: "login", authMethod: "email", otpSent: false, otp: "", waEnabled: !!window.WA_AUTH, authErr: "", authNotice: "", authForgot: false, authRecovery: false, recoveryPassword: "", recoveryConfirm: "", copied: false, copiedCode: false,
    tab: "homeSaaS", subTab: "home", lang: "fr", countries: COUNTRIES, cart: [], pay: "",
    addPm: "", lastOrderCode: "", lastOrderTotal: 0, lastOrderItems: [], lastOrderCustomer: null, lastOrderMessage: "", lastOrderPayment: "", lastOrderShopName: "",
    cardData: { number: "", exp: "", cvv: "" },

    plans: [
      { id: "starter", nameKey: "planStarter", subtitleKey: "subStarter", price: 3000, maxProd: 10, videoAllowed: false, featureKeys: ["f1", "f2", "f3"] },
      { id: "pro", nameKey: "planPro", subtitleKey: "subPro", price: 6000, maxProd: 50, videoAllowed: true, featureKeys: ["f4", "f5", "f6", "f7", "f12", "f13", "f14"] },
      { id: "premium", nameKey: "planPremium", subtitleKey: "subPremium", price: 10000, maxProd: 9999, videoAllowed: true, featureKeys: ["f8", "f9", "f10", "f11", "f15", "f16", "f17", "f18"] }
    ],

    f: { fullName: "", shopName: "", country: "Sénégal", location: "", phone: "", email: "", password: "", idFile: "", idErr: "", idBlob: null, idConsent: false },
    cust: { name: "", phone: "", address: "", mapLink: "" }, newP: { title: "", desc: "", price: "", img: "", imgName: "", video: "" },
    shop: blankShop(),
    orders: [],
    rates: null,

    stats: { visits: 0, revenue: 0, orders: 0, graphs: { visits: "0,25 20,20 40,22 60,15 80,18 100,5", revenue: "0,28 20,24 40,20 60,12 80,15 100,2", orders: "0,29 20,27 40,25 60,20 80,10 100,4" } },

    init: function () {
      var self = this;
      this.$watch("shop", function () { if (!self.remote) self.queue(); }, { deep: true });
      this.$watch("lang", function (v) { document.documentElement.lang = v; });
      db.auth.onAuthStateChange(function (event) {
        if (event === "PASSWORD_RECOVERY") {
          self.authRecovery = true;
          self.authForgot = false;
          self.authErr = "";
          self.authNotice = "";
          self.tab = "vendor";
          self.ready = true;
        }
      });

      if (shopId) {
        this.loadRemote(shopId);
        this.ready = true;
      } else {
        // S'il n'y a pas de ?b=..., on reste sur la page d'accueil SaaS par défaut sans charger automatiquement la session vendeur
        this.ready = true;
        try { db.rpc("track_view", { p_key: "home" }); } catch (e) {}
      }
      this.loadRates();
      var draw = function () { if (window.lucide) lucide.createIcons(); };
      setTimeout(draw, 100);
    },

    // Méthode appelée quand on clique sur "Accéder à mon espace vendeur" depuis la page d'accueil SaaS
    openVendorSpace: async function() {
      this.loading = true;
      try {
        var session = (await db.auth.getSession()).data.session;
        await this.onSession(session);
      } finally {
        this.loading = false;
      }
      this.tab = "vendor";
    },

    aiInvoke: async function (body) {
      var result = await db.functions.invoke("boutique-ai", { body: Object.assign({ shopId: this.shop.sid, locale: this.lang }, body || {}) });
      if (result.error || !result.data || result.data.error) {
        var msg = result.data && result.data.error ? result.data.error : "";
        if (!msg && result.error && result.error.context) {
          try { var detail = await result.error.context.clone().json(); msg = detail.error || detail.message || ""; } catch (e) {}
        }
        throw new Error(msg || (result.error && result.error.message) || "Assistant IA indisponible.");
      }
      return result.data;
    },
    openAiAssistant: async function () {
      if (!this.authed || !this.shop.sid) { alert("Connectez-vous à votre espace vendeur pour utiliser l'assistant IA."); return; }
      this.aiError = ""; this.modal = "aiChat"; await this.loadAiConversations();
    },
    loadAiConversations: async function () {
      this.aiHistoryBusy = true;
      try {
        var data = await this.aiInvoke({ action: "list_conversations" });
        this.aiConversations = data.conversations || [];
        if (!this.aiConversations.length) await this.newAiConversation();
        else if (!this.aiConversationId || !this.aiConversations.some((c) => c.id === this.aiConversationId))
          await this.selectAiConversation(this.aiConversations[0].id);
        else await this.selectAiConversation(this.aiConversationId);
      } catch (error) { this.aiError = error.message || "Impossible de charger l'historique."; }
      finally { this.aiHistoryBusy = false; }
    },
    selectAiConversation: async function (id) {
      var targetId = id || this.aiConversationId; if (!targetId) return;
      this.aiHistoryBusy = true;
      try {
        var data = await this.aiInvoke({ action: "get_conversation", conversationId: targetId });
        this.aiConversationId = targetId;
        this.aiMessages = Array.isArray(data.conversation.messages) ? data.conversation.messages : [];
        if (!this.aiMessages.length) this.aiMessages = [{ role: "assistant", content: this.t("aiGreeting") }];
        this.aiError = "";
      } catch (error) { this.aiError = error.message || "Impossible d'ouvrir cette conversation."; }
      finally { this.aiHistoryBusy = false; }
    },
    newAiConversation: async function () {
      try {
        var data = await this.aiInvoke({ action: "create_conversation" });
        this.aiConversations.unshift(data.conversation); this.aiConversationId = data.conversation.id;
        this.aiMessages = [{ role: "assistant", content: this.t("aiGreeting") }]; this.aiError = "";
      } catch (error) { this.aiError = error.message || "Impossible de créer une conversation."; }
    },
    deleteAiConversation: async function () {
      if (!this.aiConversationId || !confirm("Supprimer définitivement cette conversation ?")) return;
      try {
        await this.aiInvoke({ action: "delete_conversation", conversationId: this.aiConversationId });
        this.aiConversations = this.aiConversations.filter((c) => c.id !== this.aiConversationId);
        this.aiConversationId = "";
        if (this.aiConversations.length) await this.selectAiConversation(this.aiConversations[0].id);
        else await this.newAiConversation();
      } catch (error) { this.aiError = error.message || "Impossible de supprimer cette conversation."; }
    },
    sendAiMessage: async function () {
      var message = String(this.aiInput || "").trim(); if (!message || this.aiBusy) return;
      if (!this.aiConversationId) await this.newAiConversation();
      if (!this.aiConversationId) return;
      this.aiMessages.push({ role: "user", content: message }); this.aiInput = "";
      this.aiBusy = true; this.aiError = "";
      try {
        var sessionResult = await db.auth.getSession();
        var session = sessionResult && sessionResult.data && sessionResult.data.session;
        if (!session || !session.access_token) throw new Error("Votre session vendeur a expiré. Reconnectez-vous.");
        var result = await this.aiInvoke({ action: "chat", conversationId: this.aiConversationId, message: message });
        this.aiMessages.push({ role: "assistant", content: result.answer });
        var current = this.aiConversations.find((c) => c.id === this.aiConversationId);
        if (current) current.title = message.slice(0, 70);
      } catch (error) { this.aiMessages.pop(); this.aiError = error.message || "Impossible de contacter l'assistant IA."; }
      finally { this.aiBusy = false; }
    },
    t: function (k) { return (TR[this.lang] && TR[this.lang][k]) || (TR.fr && TR.fr[k]) || k; },
    statusLabel: function (s) {
      var k = String(s || "pending");
      return this.t("status" + k.charAt(0).toUpperCase() + k.slice(1));
    },
    get vendorOpen() { return !this.remote || location.hash === "#vendeur" || this.tab === "vendor"; },
    get count() { return this.cart.reduce(function (s, i) { return s + i.quantity; }, 0); },
    get total() { return this.cart.reduce(function (s, i) { return s + i.price * i.quantity; }, 0); },
    get totalRevenue() { return this.orders.reduce(function (s, o) { return s + (o.total || 0); }, 0); },

    get currentCurrency() { return CUR[this.shop.country] || "XOF"; },
    fmt: function (n) { return new Intl.NumberFormat("fr-FR").format(n) + " " + this.shop.currency; },

    loadRates: async function () {
      try {
        var res = await fetch("https://open.er-api.com/v6/latest/XOF");
        var j = await res.json();
        if (j.result === "success" && j.rates) this.rates = j.rates;
      } catch (e) {}
    },

    convertPrice: function (fcfaAmount) {
      var cur = this.currentCurrency;
      if (cur === "XOF" || cur === "XAF" || !this.rates || !this.rates[cur]) return new Intl.NumberFormat("fr-FR").format(fcfaAmount) + " FCFA";
      var converted = fcfaAmount * this.rates[cur];
      return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(converted) + " " + cur;
    },

    setCountry: function () {
      this.shop.currency = CUR[this.shop.country] || "XOF";
    },

    get base() { return location.protocol === "file:" ? "" : location.origin + location.pathname.replace(/index\.html$/, ""); },
    get link() { return (this.base && this.shop.sid) ? this.base + "?b=" + this.shop.sid : ""; },
    copyLink: function () {
      var self = this, u = this.link;
      function done() { self.copied = true; setTimeout(function () { self.copied = false; }, 2000); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(done, function () { prompt("Copiez ce lien :", u); });
      else prompt("Copiez ce lien :", u);
    },
    share: function () {
      var u = this.link;
      if (!u) { alert("Votre lien n’est pas encore prêt."); return; }
      window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent("Découvrez " + this.shop.name + " : " + u), "_blank");
    },

    get currentPlanObj() {
      var pid = this.shop.plan || "pro";
      return this.plans.find(function(p){ return p.id === pid; }) || this.plans[1];
    },
    formatSubscriptionPrice: function (amount) {
      var country = String(this.shop.country || "").trim().toLowerCase();
      var isSenegal = country === "sn" || country === "senegal" || country === "sénégal";
      if (!isSenegal || this.shop.currency !== "XOF") return "Tarif local à confirmer";
      return new Intl.NumberFormat("fr-FR").format(amount) + " XOF";
    },
    requestPlan: async function (planId) {
      if (!this.authed) {
        alert("Connectez-vous à votre espace vendeur avant de souscrire.");
        return;
      }
      if (!["starter", "pro", "premium"].includes(planId)) {
        alert("Formule invalide.");
        return;
      }
      var country = String(this.shop.country || "").trim().toLowerCase();
      var isSenegal = country === "sn" || country === "senegal" || country === "sénégal";
      if (!isSenegal || this.shop.currency !== "XOF") {
        alert("Les paiements d’abonnement ne sont pas encore activés pour votre pays. Aucun montant ne sera prélevé.");
        return;
      }
      if (this.checkoutBusy) return;
      this.checkoutBusy = true;
      try {
        if (!this.shop.sid) this.shop.sid = rnd(8);
        var saved = await this.save();
        if (saved && saved.error) throw saved.error;
        var result = await db.functions.invoke("create-subscription-checkout", {
          body: { shopId: this.shop.sid, planSlug: planId }
        });
        if (result.error || !result.data || !result.data.checkoutUrl) {
          var message = result.data && result.data.error ? result.data.error : "Impossible de préparer le paiement. Réessayez plus tard.";
          alert(message);
          return;
        }
        window.location.assign(result.data.checkoutUrl);
      } catch (error) {
        alert("Une erreur est survenue. Aucun abonnement n’a été activé.");
      } finally {
        this.checkoutBusy = false;
      }
    },
    get canAddProduct() {
      return this.shop.products.length < this.currentPlanObj.maxProd;
    },

    // Côté client (boutique publique), le serveur ne renvoie que les NOMS des modes de paiement (pmNames)
    get payOpts() {
      if (this.remote) return Array.isArray(this.shop.pmNames) ? this.shop.pmNames.filter(function (name) { return name !== CARD; }) : [];
      var p = this.shop.pm || {};
      return Object.keys(p).filter(function (k) { return k !== CARD && String(p[k] || "").trim(); });
    },
    get pmOptions() {
      var p = this.shop.pm || {};
      // Le paiement par carte n'est pas encore branché : on ne le propose pas aux vendeurs
      return PM_LIST.filter(function (m) { return p[m[0]] === undefined && m[0] !== CARD; });
    },
    addPay: function () {
      var n = this.addPm; this.addPm = "";
      if (!n) return;
      var o = {}; o[n] = n === CARD ? "Intégration directe active" : "";
      this.shop.pm = Object.assign({}, this.shop.pm, o);
    },
    removePay: function (n) { var o = Object.assign({}, this.shop.pm); delete o[n]; this.shop.pm = o; },

    onSession: async function (session) {
      if (shopId) return;
      if (!session) { this.authed = false; this.shop = blankShop(); this.aiMessages = []; this.aiConversations = []; this.aiConversationId = ""; this.accountEmail = ""; this.accountPhone = ""; this.accountPhoneDraft = ""; this.ready = true; return; }
      this.uid = session.user.id;
      this.accountEmail = session.user.email || ""; this.accountMessage = "";
      var s = await db.from("shops").select("id,data,suspended").eq("owner", this.uid).maybeSingle();
      var vq = await db.from("vendors").select("full_name,phone,country,location,shop_name,id_status").eq("id", this.uid).maybeSingle();
      var v = vq.data || {};
      this.accountPhone = v.phone || "";
      this.accountPhoneDraft = this.accountPhone;
      if (s.data) {
        this.shop = norm(Object.assign(blankShop(), s.data.data, { sid: s.data.id }));
      } else {
        // Aucune boutique en base : on prépare la boutique avec les infos du vendeur (et non la boutique par défaut)
        var m = session.user.user_metadata || {};
        var b = blankShop();
        b.name = v.shop_name || m.shop_name || b.name;
        b.owner = v.full_name || m.full_name || "";
        b.country = v.country || m.country || b.country;
        b.currency = CUR[b.country] || b.currency;
        b.location = v.location || m.location || "";
        b.wa = v.phone || m.phone || "";
        this.shop = norm(b);
      }
      this.shop.verified = (v.id_status === "approved");
      this.authed = true; this.ready = true;
      await this.loadOrders();
      this.updateStats();
      await this.checkSubscriptionReturn();
    },

    checkSubscriptionReturn: async function () {
      var params = new URLSearchParams(location.search);
      var resultType = params.get("subscription");
      var paymentId = params.get("payment_id");
      if (!["return", "cancelled"].includes(resultType) || !paymentId || !this.authed) return;

      // Remove callback parameters immediately so refreshes do not replay the status check.
      params.delete("subscription");
      params.delete("payment_id");
      var cleanUrl = location.pathname + (params.toString() ? "?" + params.toString() : "") + location.hash;
      history.replaceState({}, document.title, cleanUrl);

      try {
        var payment = null;
        for (var attempt = 0; attempt < 8; attempt++) {
          var response = await db.from("subscription_payments")
            .select("status,amount,currency")
            .eq("id", paymentId)
            .maybeSingle();
          if (response.error) throw response.error;
          payment = response.data;
          if (!payment || payment.status !== "pending") break;
          await new Promise(function(resolve) { setTimeout(resolve, 1500); });
        }

        if (!payment) {
          alert("Retour de paiement reçu, mais la transaction n'est pas visible pour cette boutique. Aucun abonnement n'a été activé par le navigateur.");
        } else if (payment.status === "paid") {
          alert("Paiement confirmé par PayDunya. Votre abonnement est activé.");
          await this.onSession((await db.auth.getSession()).data.session);
        } else if (payment.status === "failed") {
          alert("PayDunya a confirmé l'annulation ou le refus du paiement. Aucun nouvel abonnement n'a été activé.");
        } else if (resultType === "cancelled") {
          alert("Vous êtes revenu après avoir interrompu le paiement, mais son annulation n'est pas encore confirmée par PayDunya. Ne relancez pas le paiement tout de suite : vérifiez le statut dans quelques instants.");
        } else {
          alert("Votre paiement est encore en cours de vérification. Ne payez pas une deuxième fois tout de suite : actualisez votre espace vendeur dans quelques instants.");
        }
      } catch (error) {
        console.error("Subscription return status check failed:", error);
        alert("Impossible de vérifier le statut du paiement pour le moment. Votre abonnement ne sera activé qu'après confirmation serveur.");
      }
    },

    updateStats: function() {
      this.stats.visits = this.shop.visits || 0;
      this.stats.revenue = this.totalRevenue;
      this.stats.orders = this.orders.length;
    },

    onId: function (e) {
      var x = e.target.files[0];
      this.f.idErr = "";
      if (!x) return;
      if (!ID_EXT[x.type]) {
        this.f.idErr = "Format non accepté (JPG, PNG, WEBP ou PDF).";
        return;
      }
      if (x.size > 5 * 1024 * 1024) {
        alert("Le fichier est trop volumineux (maximum 5 Mo).");
        return;
      }
      this.f.idFile = x.name;
      this.f.idBlob = x;
    },

    // Envoi de la pièce d'identité dans le bucket PRIVÉ "id-docs" + enregistrement du chemin dans "vendors"
    uploadIdDoc: async function (uid, file, consent) {
      var ext = ID_EXT[file.type];
      if (!ext) return { error: { message: "Format non accepté (JPG, PNG, WEBP ou PDF)." } };
      var path = uid + "/identity_" + Date.now() + "." + ext;
      var up = await db.storage.from("id-docs").upload(path, file, { contentType: file.type });
      if (up.error) return up;
      var patch = { id_doc_path: path };
      if (consent) patch.id_consent_at = new Date().toISOString();
      return await db.from("vendors").update(patch).eq("id", uid);
    },

    submitIdVerification: async function () {
      if (!this.f.idBlob) {
        alert("Veuillez sélectionner un fichier.");
        return;
      }
      if (!this.f.idConsent) {
        alert("Veuillez accepter le consentement.");
        return;
      }
      try {
        var vr = await db.from("vendors").select("id_doc_path,id_status").eq("id", this.uid).maybeSingle();
        if (vr.data && vr.data.id_doc_path && vr.data.id_status !== "rejected") {
          alert("Votre pièce d'identité a déjà été envoyée et est en cours de vérification.");
          return;
        }
        var r = await this.uploadIdDoc(this.uid, this.f.idBlob, true);
        if (r.error) throw r.error;
        alert("Document envoyé avec succès !");
      } catch (err) {
        alert("Erreur lors de l'envoi." + (err && err.message ? "\n" + err.message : ""));
      }
    },

    authMsg: function (err) {
      var m = String((err && err.message) || "");
      if (/not confirmed/i.test(m)) return "Votre email n'est pas encore confirmé. Ouvrez le message de confirmation reçu par email, puis reconnectez-vous.";
      if (/rate limit|too many/i.test(m)) return "Trop de tentatives ou d'emails envoyés. Patientez un moment puis réessayez.";
      if (/already registered|already been registered/i.test(m)) return "Cet email est déjà utilisé. Connectez-vous ou confirmez votre email.";
      if (/password/i.test(m) && /characters|weak|short/i.test(m)) return "Mot de passe trop court ou trop faible (6 caractères minimum).";
      if (/invalid login|invalid credentials/i.test(m)) return "Email ou mot de passe incorrect.";
      if (/signups not allowed|user not found/i.test(m)) return "Aucun compte avec ce numéro. Créez d'abord votre boutique.";
      if (/invalid.*phone|phone.*invalid/i.test(m)) return "Numéro invalide. Utilisez le format international, ex : +221771234567.";
      if (/expired|invalid.*(token|otp)|token.*invalid/i.test(m)) return "Code incorrect ou expiré.";
      if (/failed to fetch|network/i.test(m)) return "Problème de connexion internet. Réessayez.";
      return m || "Une erreur est survenue. Réessayez.";
    },

    switchAuth: function () { this.authMode = this.authMode === "login" ? "signup" : "login"; this.authErr = ""; this.authNotice = ""; this.authForgot = false; this.authRecovery = false; this.otpSent = false; this.otp = ""; },
    openVendorForgot: function () {
      this.authForgot = true;
      this.authErr = "";
      this.authNotice = "";
      this.f.password = "";
    },
    sendVendorRecovery: async function () {
      this.authErr = "";
      this.authNotice = "";
      var email = String(this.f.email || "").trim().toLowerCase();
      if (!email) { this.authErr = "Saisis l’adresse e-mail de ton compte vendeur."; return; }
      this.busy = true;
      try {
        var redirect = location.origin + location.pathname + "?mode=recovery";
        var result = await db.auth.resetPasswordForEmail(email, { redirectTo: redirect });
        if (result.error) throw result.error;
        this.authNotice = "Si cette adresse correspond à un compte, un lien de réinitialisation vient d’être envoyé. Vérifie aussi tes courriers indésirables.";
      } catch (error) {
        this.authErr = this.authMsg(error) || "Impossible d’envoyer le lien. Réessaie dans quelques instants.";
      } finally {
        this.busy = false;
      }
    },
    saveVendorRecoveryPassword: async function () {
      this.authErr = "";
      this.authNotice = "";
      if (String(this.recoveryPassword || "").length < 10) { this.authErr = "Le mot de passe doit contenir au moins 10 caractères."; return; }
      if (this.recoveryPassword !== this.recoveryConfirm) { this.authErr = "Les deux mots de passe ne correspondent pas."; return; }
      this.busy = true;
      try {
        var result = await db.auth.updateUser({ password: this.recoveryPassword });
        if (result.error) throw result.error;
        this.recoveryPassword = "";
        this.recoveryConfirm = "";
        this.authRecovery = false;
        this.authNotice = "Mot de passe modifié avec succès. Connexion à ton espace vendeur…";
        history.replaceState({}, document.title, location.pathname);
        var sessionResult = await db.auth.getSession();
        var session = sessionResult && sessionResult.data && sessionResult.data.session;
        if (session) {
          await this.onSession(session);
          this.tab = "vendor";
          this.authNotice = "Ton mot de passe a été modifié. Bienvenue dans ton espace vendeur.";
        } else {
          this.authMode = "login";
          this.authMethod = "email";
          this.tab = "vendor";
          this.authNotice = "Mot de passe modifié. Tu peux maintenant te connecter avec ton nouveau mot de passe.";
        }
      } catch (error) {
        this.authErr = this.authMsg(error) || "Le lien est peut-être expiré. Demande un nouveau lien de réinitialisation.";
      } finally {
        this.busy = false;
      }
    },
    normPhone: function (v) {
      var x = String(v || "").replace(/[\s().-]/g, "");
      if (x.indexOf("00") === 0) x = "+" + x.slice(2);
      return /^\+\d{8,15}$/.test(x) ? x : "";
    },

    // Connexion / inscription par code reçu sur WhatsApp (nécessite Twilio configuré dans Supabase)
    submitWa: async function () {
      var f = this.f, m = this.authMode;
      var phone = this.normPhone(f.phone);
      this.authErr = "";
      if (!phone) { this.authErr = "Numéro invalide. Utilisez le format international, ex : +221771234567."; return; }
      if (m === "signup" && (!f.idFile || !f.fullName.trim() || !f.shopName.trim())) {
        this.authErr = "Nom, nom de boutique et pièce d'identité sont obligatoires.";
        return;
      }
      this.busy = true;
      try {
        if (!this.otpSent) {
          var o = { channel: "whatsapp", shouldCreateUser: m === "signup" };
          if (m === "signup") o.data = { full_name: f.fullName.trim(), phone: phone, country: f.country, location: f.location, shop_name: f.shopName.trim(), id_verified: false };
          var r = await db.auth.signInWithOtp({ phone: phone, options: o });
          if (r.error) { this.authErr = this.authMsg(r.error); return; }
          this.otpSent = true;
          this.authErr = "Code envoyé sur WhatsApp au " + phone + ". Saisissez-le ci-dessous.";
        } else {
          var v = await db.auth.verifyOtp({ phone: phone, token: String(this.otp || "").trim(), type: "sms" });
          if (v.error) { this.authErr = this.authMsg(v.error); return; }
          if (m === "signup" && f.idBlob && v.data && v.data.user) {
            var up = await this.uploadIdDoc(v.data.user.id, f.idBlob, false);
            if (up && up.error) alert("Compte créé, mais l'envoi de la pièce d'identité a échoué. Vous pourrez la renvoyer depuis votre tableau de bord.");
          }
          location.reload();
        }
      } catch (e) { this.authErr = this.authMsg(e); }
      finally { this.busy = false; }
    },

    submitAuth: async function () {
      if (this.authMethod === "whatsapp") return this.submitWa();
      var f = this.f, m = this.authMode;
      var email = f.email.trim().toLowerCase();

      if (m === "signup" && !f.idFile) {
        this.authErr = "Veuillez fournir une pièce d'identité pour valider la boutique.";
        return;
      }

      this.busy = true;
      try {
        if (m === "signup") {
          var r = await db.auth.signUp({
            email: email, password: f.password,
            options: {
              emailRedirectTo: location.origin + location.pathname,
              data: {
                full_name: f.fullName,
                phone: f.phone,
                country: f.country,
                location: f.location,
                shop_name: f.shopName,
                id_verified: false
              }
            }
          });
          if (r.error) { this.authErr = this.authMsg(r.error); return; }

          if (r.data.session) {
            if (r.data.user && f.idBlob) {
              var up = await this.uploadIdDoc(r.data.user.id, f.idBlob, false);
              if (up && up.error) alert("Compte créé, mais l'envoi de la pièce d'identité a échoué. Vous pourrez la renvoyer depuis votre tableau de bord.");
            }
            location.reload();
          } else {
            // Confirmation par email activée : pas de session tout de suite
            this.authErr = "Compte créé ! Vérifiez votre email pour le confirmer, puis connectez-vous (vous enverrez votre pièce d'identité depuis le tableau de bord).";
            this.authMode = "login";
          }
        } else {
          var r2 = await db.auth.signInWithPassword({ email: email, password: f.password });
          if (r2.error) { this.authErr = this.authMsg(r2.error); return; }
          location.reload();
        }
      } finally { this.busy = false; }
    },

    saveAccountPhone: async function () {
      var phone = this.normPhone(this.accountPhoneDraft);
      this.accountMessage = "";
      if (!phone) { alert("Numéro invalide. Utilisez le format international, ex : +221771234567."); return; }
      if (!this.uid) { alert("Session vendeur introuvable. Reconnectez-vous."); return; }
      this.accountSaving = true;
      try {
        var result = await db.from("vendors").update({ phone: phone }).eq("id", this.uid).select("id").maybeSingle();
        if (result.error) throw result.error;
        if (!result.data) throw new Error("Profil vendeur introuvable ou modification non autorisée.");
        this.accountPhone = phone;
        this.accountPhoneDraft = phone;
        this.accountMessage = this.t("accountPhoneSaved");
      } catch (error) {
        alert("Impossible d'enregistrer le numéro : " + ((error && error.message) || "réessayez."));
      } finally {
        this.accountSaving = false;
      }
    },

    changePassword: async function () {
      var form = this.passwordForm;
      if (!form.current || !form.next || !form.confirm) {
        alert("Veuillez remplir les trois champs du mot de passe.");
        return;
      }
      if (form.next.length < 8) {
        alert(this.t("passwordTooShort"));
        return;
      }
      if (form.next !== form.confirm) {
        alert(this.t("passwordMismatch"));
        return;
      }
      this.passwordBusy = true;
      try {
        var userResult = await db.auth.getUser();
        var user = userResult && userResult.data && userResult.data.user;
        if (userResult.error || !user) throw new Error("Session vendeur introuvable. Reconnectez-vous.");
        var credentials = user.email
          ? { email: user.email, password: form.current }
          : (user.phone ? { phone: user.phone, password: form.current } : null);
        if (!credentials) throw new Error("Ce compte ne dispose pas d'un identifiant permettant de vérifier le mot de passe actuel.");
        var reauth = await db.auth.signInWithPassword(credentials);
        if (reauth.error) throw new Error("Le mot de passe actuel est incorrect.");
        var update = await db.auth.updateUser({ password: form.next });
        if (update.error) throw update.error;
        this.passwordForm = { current: "", next: "", confirm: "" };
        alert(this.t("passwordChanged"));
      } catch (error) {
        alert((error && error.message) || this.t("passwordChangeError"));
      } finally {
        this.passwordBusy = false;
      }
    },

    logout: async function () {
      try {
        await db.auth.signOut();
      } catch (e) {}
      localStorage.clear();
      sessionStorage.clear();
      location.reload();
    },

    cancelSubscription: function() {
      alert("La résiliation en ligne n’est pas encore disponible. Les abonnements PayDunya sont configurés sans renouvellement automatique.");
    },

    // Suppression RÉELLE : appelle la fonction serveur delete_my_account() qui supprime l'utilisateur
    // (la boutique, les commandes et le profil vendeur partent avec, en cascade).
    deleteAccount: async function() {
      var confirmation = prompt("Attention : Cette action est irréversible. Toutes vos données et articles seront effacés.\n\nPour confirmer, tapez SUPPRIMER :");
      if (confirmation === "SUPPRIMER") {
        try {
          this.busy = true;
          this.deleting = true;
          clearTimeout(tmr);
          this.authed = false; // empêche l'enregistrement automatique de recréer la boutique

          // Nettoyage des fichiers (photos + pièce d'identité) : on continue même si une étape échoue
          var self = this, buckets = ["shop-media", "id-docs"];
          for (var i = 0; i < buckets.length; i++) {
            try {
              var l = await db.storage.from(buckets[i]).list(this.uid);
              if (l.data && l.data.length) {
                await db.storage.from(buckets[i]).remove(l.data.map(function (x) { return self.uid + "/" + x.name; }));
              }
            } catch (e) {}
          }

          if (this.shop.sid) {
            await db.from("shops").delete().eq("id", this.shop.sid);
          }
          var r = await db.rpc("delete_my_account");
          if (r.error) throw r.error;

          try { await db.auth.signOut({ scope: "local" }); } catch (e) {}
          localStorage.clear();
          sessionStorage.clear();
          alert("Votre compte a été supprimé.");
          location.reload();
        } catch (err) {
          this.deleting = false;
          this.authed = true;
          alert("Une erreur est survenue lors de la suppression." + (err && err.message ? "\n" + err.message : ""));
        } finally {
          this.busy = false;
        }
      }
    },

    queue: function () {
      var self = this;
      if (!this.authed || this.remote || this.deleting) return;
      clearTimeout(tmr); tmr = setTimeout(function () { self.save(); }, 1000);
    },
    save: async function () {
      if (this.deleting || !this.authed) return;
      if (!this.shop.sid) this.shop.sid = rnd(8);
      var r = await db.from("shops").upsert({ id: this.shop.sid, owner: this.uid, data: this.shop }, { onConflict: "id" });
      if (r && r.error) console.error("Sauvegarde de la boutique échouée :", r.error.message);
      return r;
    },

    loadRemote: async function (id) {
      try {
        var r = await db.rpc("get_shop", { p_id: id });
        if (r.error || !r.data) throw new Error();

        var shopData = norm(Object.assign(blankShop(), r.data));
        // get_shop ne renvoie que les boutiques déjà validées par l'administration
        shopData.verified = true;

        if (shopData.verified === false) {
          this.remoteErr = "Cette boutique est en cours de validation administrative (pièce d'identité requise).";
          this.loading = false;
          return;
        }

        this.shop = shopData;
        this.remote = true;
        this.tab = "client";

        try { db.rpc("track_view", { p_key: "shop:" + id }); } catch (e) {}
        this.shop.visits = (this.shop.visits || 0) + 1;
        await db.from("shops").update({ data: this.shop }).eq("id", id);
      } catch (e) {
        this.remoteErr = "Boutique introuvable ou en cours de validation.";
      }
      this.loading = false;
    },

    add: function (p) { if (!p.inStock) return; var x = this.cart.find(function (i) { return i.id === p.id; }); if (x) x.quantity++; else this.cart.push({ id: p.id, title: p.title, price: p.price, quantity: 1 }); },
    minus: function (i) { if (i.quantity > 1) i.quantity--; else this.cart = this.cart.filter(function (c) { return c.id !== i.id; }); },

    proceedCheckout: function () {
      if (this.checkoutBusy) return;
      var c = this.cust;
      if (!this.cart.length) {
        alert("Votre panier est vide.");
        return;
      }
      if (!c.name.trim() || !c.phone.trim()) {
        alert("Veuillez renseigner votre nom et votre numéro de téléphone.");
        return;
      }
      // Si le vendeur n'a configuré aucun mode de paiement, le client peut quand même commander ("Le vendeur vous indiquera comment procéder")
      if (this.payOpts.length && !this.pay) {
        alert("Veuillez sélectionner un mode de paiement.");
        return;
      }

      if (this.pay === CARD) {
        alert("Le paiement par carte bancaire n’est pas encore disponible. Choisissez un autre moyen de paiement.");
        return;
      }
      this.finalizeOrder();
    },

    processCardPayment: function () {
      this.modal = '';
      this.cardData = { number: "", exp: "", cvv: "" };
      alert("Le paiement par carte bancaire n’est pas encore intégré. Aucun débit n’a été effectué.");
    },

    finalizeOrder: async function () {
      if (this.checkoutBusy) return;
      this.checkoutBusy = true;
      try {
        var c = this.cust, self = this;
        var trackingCode = "CMD-" + rnd(6).toUpperCase();
        var orderTotal = this.total;
        var message = "Adresse : " + (c.address || "-") + (c.mapLink ? "\nGPS : " + c.mapLink : "");
        var orderItemsSnapshot = JSON.parse(JSON.stringify(this.cart));

        var newOrder = {
          id: Date.now(),
          trackingCode: trackingCode,
          shop_id: this.shop.sid || "local",
          customer: { name: c.name, phone: c.phone, address: c.address, mapLink: c.mapLink || "" },
          items: orderItemsSnapshot,
          total: orderTotal,
          paymentMethod: this.pay || "Non spécifié",
          message: message,
          status: "pending",
          created_at: new Date().toISOString()
        };

        if (this.remote && this.shop.sid) {
          try {
            var r = await db.rpc("place_order", {
              p_shop: this.shop.sid,
              p_ref: trackingCode,
              p_name: c.name.trim(),
              p_phone: c.phone.trim(),
              p_mode: this.pay || "Non spécifié",
              p_message: message,
              p_items: this.cart.map(function (item) {
                return { id: String(item.id), quantity: item.quantity };
              })
            });
            if (r.error || !r.data || r.data.ok !== true) {
              alert((r.data && r.data.error) || "Votre commande n'a pas pu être enregistrée. Vérifiez le stock ou réessayez dans quelques minutes.");
              return;
            }
            if (!r.data.id) {
              alert("La commande a été enregistrée, mais son identifiant n'a pas été retourné. Actualisez la page avant de modifier son statut.");
              await this.loadOrders();
              return;
            }
            newOrder.id = r.data.id;
            orderTotal = Number(r.data.total);
            newOrder.total = orderTotal;
            newOrder.items = Array.isArray(r.data.items) ? r.data.items : orderItemsSnapshot;
            newOrder.message = r.data.message || message;
            this.orders.unshift(newOrder);
          } catch (err) {
            alert("Erreur réseau : votre commande n'a pas été enregistrée.");
            return;
          }
        } else {
          this.orders.unshift(newOrder);
        }

        // Snapshot indépendant du panier : le panier peut être vidé après l'enregistrement.
        this.lastOrderCode = trackingCode;
        this.lastOrderTotal = orderTotal;
        this.lastOrderItems = newOrder.items;
        this.lastOrderCustomer = {
          name: c.name.trim(),
          phone: c.phone.trim(),
          address: c.address || "",
          mapLink: c.mapLink || ""
        };
        this.lastOrderMessage = message;
        this.lastOrderPayment = this.pay || "Non spécifié";
        this.lastOrderShopName = this.shop.name || "Boutique";
        this.updateStats();
        this.modal = "orderSuccess";
        this.cart = [];
      } finally {
        this.checkoutBusy = false;
      }
    },

    copyTrackingCode: function () {
      var self = this;
      function done() { self.copiedCode = true; setTimeout(function () { self.copiedCode = false; }, 2000); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(this.lastOrderCode).then(done);
      else prompt("Copiez votre code de suivi :", this.lastOrderCode);
    },

    openWhatsAppOrder: function () {
      var wa = normalizeWhatsAppDigits(this.shop.wa, this.shop.country);
      if (!wa) {
        alert("Le numéro WhatsApp du vendeur est absent ou invalide. Le vendeur doit le corriger dans les paramètres de sa boutique au format international, par exemple +221771234567.");
        return;
      }
      if (!this.lastOrderCode || !this.lastOrderCustomer) {
        alert("La commande enregistrée est introuvable. Actualisez la page avant de réessayer.");
        return;
      }

      var customer = this.lastOrderCustomer;
      var lines = [
        "Bonjour, je viens d'enregistrer une commande sur Boutique ti i.",
        "Boutique : " + this.lastOrderShopName,
        "Référence : " + this.lastOrderCode,
        "",
        "CLIENT",
        "Nom : " + customer.name,
        "Téléphone : " + customer.phone,
        "",
        "ARTICLES"
      ];
      (this.lastOrderItems || []).forEach(function (item) {
        var quantity = Math.max(1, Number(item.quantity) || 1);
        var unitPrice = Number(item.price) || 0;
        lines.push("- " + (item.title || "Article") + " x " + quantity + " — " + this.fmt(unitPrice * quantity));
      }, this);
      lines.push(
        "",
        "Total : " + this.fmt(this.lastOrderTotal),
        "Paiement choisi : " + this.lastOrderPayment,
        "Adresse de livraison : " + (customer.address || "Non renseignée")
      );
      if (customer.mapLink) lines.push("Localisation GPS : " + customer.mapLink);
      lines.push("", "Merci de confirmer la disponibilité et les modalités de livraison.");

      var url = "https://wa.me/" + wa + "?text=" + encodeURIComponent(lines.join("\n"));
      var opened = window.open(url, "_blank");
      if (!opened) {
        alert("Le navigateur a bloqué l'ouverture de WhatsApp. Autorisez les fenêtres contextuelles puis réessayez.");
        return;
      }
      try { opened.opener = null; } catch (e) {}
      this.modal = "";
    },

    updateOrderStatus: async function (o) {
      if (this.shop.sid && o.id) {
        try {
          var r = await db.from("orders").update({ status: o.status }).eq("id", o.id);
          if (r && r.error) alert("Le statut n'a pas pu être enregistré : " + r.error.message);
        } catch (e) {}
      }
    },

    onImgCustom: async function (e) {
      var x = e.target.files[0];
      if (!x) return;
      this.newP.imgName = x.name;
      this.onImg(e);
    },

    onImg: async function (e) {
      var x = e.target.files[0];
      if (!x) return;

      this.imgBusy = true;
      try {
        var blob = await compress(x);
        var path = this.uid + "/" + Date.now() + ".jpg";

        var r = await db.storage.from("shop-media").upload(path, blob, {
          contentType: "image/jpeg",
          upsert: true
        });

        if (r.error) {
          alert("Erreur lors de l'upload de l'image : " + r.error.message);
          this.imgBusy = false;
          return;
        }

        var pub = db.storage.from("shop-media").getPublicUrl(path);
        if (pub && pub.data && pub.data.publicUrl) {
          this.newP.img = pub.data.publicUrl;
        }
      } catch (err) {
        alert("Une erreur est survenue lors du traitement de l'image.");
      } finally {
        this.imgBusy = false;
      }
    },

    saveProduct: function () {
      if (!this.canAddProduct) {
        alert("Votre abonnement (" + this.t(this.currentPlanObj.nameKey) + ") limite votre boutique à " + this.currentPlanObj.maxProd + " articles. Passez au plan supérieur !");
        return;
      }
      var p = parseInt(this.newP.price, 10), v = (this.newP.video || "").trim();
      if (!(this.newP.title || "").trim() || !p) { alert("Nom et prix obligatoires."); return; }

      if (v && !this.currentPlanObj.videoAllowed) {
        alert("L'ajout de vidéos nécessite l'abonnement Pro ou Premium.");
        return;
      }

      this.shop.products = this.shop.products || [];
      this.shop.products.push({ id: Date.now(), title: this.newP.title.trim(), desc: (this.newP.desc || "").trim(), price: p, img: this.newP.img, video: v, inStock: true });
      this.newP = { title: "", desc: "", price: "", img: "", imgName: "", video: "" };
    },

    deleteProduct: function (p) {
      if (!confirm("Supprimer « " + p.title + " » ?")) return;
      this.shop.products = this.shop.products.filter(function (x) { return x.id !== p.id; });
    },

    // Les commandes en base ont les colonnes : ref, customer_name, customer_phone, total, pay_mode, message, status.
    // On les convertit au format attendu par l'affichage.
    loadOrders: async function () {
      if (!this.authed || !this.shop.sid) return;
      var r = await db.from("orders").select("*").eq("shop_id", this.shop.sid).order("created_at", { ascending: false });
      if (!r.error && r.data) {
        this.orders = r.data.map(function (o) {
          var st = ["pending", "processing", "completed"].indexOf(o.status) >= 0 ? o.status : "pending";
          return {
            id: o.id,
            trackingCode: o.ref,
            shop_id: o.shop_id,
            customer: { name: o.customer_name, phone: o.customer_phone },
            items: Array.isArray(o.items) ? o.items : [],
            total: parseInt(String(o.total || "").replace(/\D/g, ""), 10) || 0,
            paymentMethod: o.pay_mode,
            message: o.message || "",
            status: st,
            created_at: o.created_at
          };
        });
      }
      this.updateStats();
    }
  };
}