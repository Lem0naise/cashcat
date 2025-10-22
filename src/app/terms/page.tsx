import Logo from "../components/logo";
import Link from 'next/link';

// If change the terms of service, change supabase 'database function' from v1.0

export const metadata = {
  title: 'Terms - CashCat',
  description: 'View the legal terms and privacy policy of CashCat.',
};

export default function Terms() {

    return (
        <div className="min-h-screen bg-background font-[family-name:var(--font-suse)] p-0 md:p-6">
            <main className="max-w-4xl mx-auto">
                <div className="text-center md:mb-8">
                    <div className="scale-75 mb-4">
                        <Logo />
                    </div>
                    <h1 className="text-3xl font-bold mb-4 px-8">Terms of Service & Privacy Policy</h1>
                </div>
                

                {/* Add this summary section */}
                <div className="bg-blue-500/[.1] border border-blue-500/[.2] rounded-lg p-6 mb-6 text-white/90">
                    <h2 className="text-xl font-semibold text-green">Quick Summary</h2>
                    <span className="text-xs text-white/60 mb-3">Effective: October 22, 2025, v1.1</span>
                    <ul className="space-y-2 text-sm list-disc list-inside">
                        <li>CashCat is a budgeting tool only - we don't handle your real money in any way</li>
                        <li>We only collect your email and any budget data you enter - we don't track you</li>
                        <li>Your data stays private - we never sell or share it</li>
                        <li>You can delete your account and all data anytime</li>
                        <li>Contact us at lemonaise.dev@gmail.com for any questions</li>
                    </ul>
                    <p className="text-xs text-white/60 mt-3 italic">
                        This summary is for convenience only. Please read the full terms of service and privacy policy below.
                    </p>
                </div>

                
                <div className="bg-white/[.02] rounded-lg p-6 space-y-6 text-white/80">
                    <h2 className="text-2xl font-semibold mb-3 text-white">Terms of Service</h2>
                    <h3 className="text-md mb-3 text-white/70">These Terms of Service were last updated on October 22nd, 2025.</h3>
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">Acceptance of Terms</h2>
                        <p>By accessing and using CashCat, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">1. Description of Service</h2>
                        <p>CashCat is a personal budget tracking and planning application that helps users organize their financial information, set goals, and track spending categories. CashCat is purely a budgeting tool and does not provide financial services, investment guidance, professional financial services, or handle real money in any way. We have no ability to change any information related to any accounts you hold at any financial institutions or banks, and no permission is requested for CashCat to do so. All financial management and transactions remain under your complete control. You are solely responsible for all financial decisions and the accuracy of data you input into the application. The service is provided for informational purposes only. CashCat does not provide or claim to provide financial advise. You agree that you are using the service at your own risk and you are solely responsible for any financial decisions you make. Any information provided is not a substitute for professional financial advice from a qualified advisor.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">2. User Accounts and Responsibilities</h2>
                        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide a valid email address when creating your account. You agree, that if you are aware that your account has become compromised, to contact CashCat support and notify us immediately. All budget data, goals, and financial information you input is your responsibility to maintain and verify.</p> <p>Where a subscription is provided, such as for access to premium features including external bank account syncing, your consumer rights apply.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">3. Prohibited Uses</h2>
                        <p>You may not use CashCat for any illegal activities, to violate any laws, or in any way that could damage or impair the service. You may not attempt to input false information that could mislead others or use the service for any commercial purposes without explicit written permission. You may not abuse any areas of the service or the account system, including maliciously and intentionally overloading servers, or creating accounts for frivolous purposes. We may terminate or suspend your account immediately, without prior notice, for any breach of these terms. Upon termination, your right to use the service ceases immediately, and we may delete your account and data in accordance with our data retention policy.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">4. Limitation of Liability</h2>
                        <p>To the fullest extent permitted by law, CashCat and its developers are not liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the service. Since CashCat does not handle actual money or financial accounts, we are not responsible for any financial losses, budgeting decisions, or financial outcomes based on your use of the application.</p>
                        <p>Our total liability to you for all claims arising from these terms or your use of the service shall not exceed the amount you paid us in the 6 months preceding the claim, or £10, whichever is greater. This limitation applies even if we have been advised of the possibility of such damages.</p>
                        <p>Some jurisdictions do not allow limitation of liability for certain types of damages, so this limitation may not apply to you to the extent prohibited by law.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">5. Modifications to Terms</h2>
                        <p>We reserve the right to modify these terms at any time. Users will be notified of significant changes, and continued use of the service after changes constitutes acceptance of the new terms.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">6. User Age Requirements</h2>
                        <p>CashCat is intended for users who are at least 18 years old. Users between 13 and 17 years old may use the service only with parental or guardian consent and supervision. Users under 13 are not permitted to use CashCat. By using this service, you confirm that you meet these age requirements.</p>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">7. Intellectual Property</h2>
                        <p>CashCat and all related content, features, and functionality are owned by us and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our service or software without our express written consent.</p>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">8. Service Availability and Modifications</h2>
                        <p>We do not guarantee that CashCat will always be available or uninterrupted. We will make all reasonable effort to keep the service online and available. We may modify, suspend, or discontinue the service at any time without notice. We are not liable for any interruption or discontinuation of service.</p>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">9. Severability</h2>
                        <p>If any provision of these Terms of Service is found to be unenforceable or invalid by a court of competent jurisdiction, that provision will be limited or eliminated to the minimum extent necessary so that these terms will otherwise remain in full force and effect. The invalidity of any particular provision will not affect the validity of the remaining provisions.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">10. Indemnification</h2>
                        <p>You agree to indemnify, defend, and hold harmless CashCat, its developers, officers, directors, employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to lawyer's fees) arising from: (1) your use of the service, (2) your violation of these terms, (3) your violation of any third party right, including without limitation any copyright, property, or privacy right, or (4) any claim that your use of the service caused damage to a third party. This indemnification obligation will survive termination of these terms and your use of the service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">11. Governing Law</h2>
                        <p>These Terms of Service are governed by and construed in accordance with the laws of England and Wales. Any disputes arising from or relating to these terms or your use of CashCat shall be subject to the exclusive jurisdiction of the courts of England and Wales. For users located outside the UK, you agree that any disputes will be resolved in accordance with English law, though local consumer protection laws may also apply where you reside. We will all make reasonable efforts to resolve disputes amicably before any formal legal proceedings are required. Before initiating any formal dispute resolution, you agree to first contact us at lemonaise.dev@gmail.com or legal@indigonolan.com to attempt to resolve the dispute amicably.</p>
                    </section>
                </div>
                
                <div className="bg-white/[.02] rounded-lg p-6 space-y-6 text-white/80">
                    <h2 className="text-2xl font-semibold mb-3 text-white">Privacy Policy</h2>
                    <h2 className="text-md mb-3 text-white/70">This Privacy Policy was last updated on October 22nd, 2025.</h2>
            
                    <section> 
                        <h2 className="text-xl font-semibold mb-3 text-green">Data Controller Information</h2>
                        <p>For the purposes of UK GDPR and data protection law, the data controller for your personal information is Zac Indigo Nolan, contactable at legal@indigonolan.com. As the data controller, we are responsible for deciding how and why your personal data is processed.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">1. Information We Collect</h2>
                        <p>We care about your privacy - so CashCat collects minimal personal information. We only store: (1) Your email address used for account creation and authentication, and (2) Budget-related information you voluntarily input, including income amounts, expense categories, financial goals, and budget planning data. We do not first-hand collect or store your name, age, or location. In cases of third-party providers and aggregation services, we may store read-only information such as transaction descriptions, dates, amounts, and account balances. We never receieve or store your bank login credentials. You are subject to the external provider's terms and privacy policy. The provider will be made clear when the user begins the process to link a bank account, and will be prominently named.</p>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">2. How We Use Your Information</h2>
                        <p>Your email address is used solely for account authentication and essential service communications. Your budget data is used exclusively to provide the app's budgeting functionality, generate your personal reports and insights, and save your preferences. We never analyze your data for advertising purposes or external use. Under GDPR, our legal basis for processing your personal data is: (1) Legitimate interest for providing the budgeting service you requested, (2) Contract performance for account management and service delivery, and (3) Your explicit consent where required. You have the right to withdraw consent at any time without affecting the lawfulness of processing based on consent before its withdrawal.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">3. Data Storage and Sharing</h2>
                        <p>All data is stored with industry-standard encryption and security measures on servers located in the United Kingdom. Your budget information is stored securely and remains completely private to your account. Secure data transmission protocols are implemented by our third-party data management providers, including Supabase for management of your budget data, and Resend for the sending of automated emails. We never sell, trade, rent, or share your personal information or budget data with other third parties. Your financial information remains completely private and is never used for advertising, marketing, or any external purposes. </p>
                        <p>If you are located outside the UK/EU, your data may be transferred to and processed in the UK under adequate data protection safeguards.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">4. Data Retention</h2>
                         <p>You have complete control over your data. You can access, modify, or delete any of your budget information at any time through the app. You can request complete account deletion, which will permanently remove all associated data. </p>
                        <p>We retain your email address and budget data only while your account remains active. Upon account deletion, all personal information including your email address and all budget data is permanently and irreversibly deleted from our systems within 7 days or as required by law, with no backup copies retained.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">5. Updates to Privacy Policy</h2>
                        <p>We may update this Privacy Policy to reflect changes in our practices or for legal compliance. The date at the top of this privacy policy will be updated to match.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">6. Contact Information</h2>
                        <p>For questions about this Privacy Policy, your data, or to request data deletion or export, please contact us through the app's support feature, or via lemonaise.dev@gmail.com. We are committed to responding to privacy-related inquiries promptly and transparently.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">7. Your Rights Under GDPR</h2>
                        <p>Under GDPR and UK GDPR, you have the right to: access your personal data, rectify inaccurate data, erase your data ("right to be forgotten"), restrict processing, data portability, and object to processing. You also have the right to withdraw consent at any time and lodge a complaint with the Information Commissioner's Office (ICO) or your local data protection authority if you believe your data protection rights have been breached.</p>
                        <p>To exercise any of these rights, please contact us at lemonaise.dev@gmail.com. We will respond to your request and provide the requested information free of charge, unless the request is manifestly unfounded or excessive.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3 text-green">8. California Consumer Privacy Act (CCPA) and Other Local Privacy Laws Compliance</h2>
                        <p>California residents have additional rights under the California Consumer Privacy Act (CCPA). We do not sell personal information and have not sold personal information in the preceding 12 months. California residents have the right to: (1) know what personal information is collected about them, (2) know whether their personal information is sold or disclosed and to whom, (3) say no to the selling of personal information, (4) access their personal information, and (5) equal service and price, even if they exercise their privacy rights.</p>
                        <p>To exercise these rights, California residents may contact us at lemonaise.dev@gmail.com. We will verify your identity before processing your request and respond within 45 days. Other local consumer protection laws may also apply depending on your jurisdiction, and we are committed to complying with all applicable privacy and consumer protection regulations.</p>
                    </section>
                </div>

                <div className="text-center mt-8 mb-8">
                    <Link
                        href="/"
                        className="px-6 py-3 bg-white/[.05] text-white/90 font-medium rounded-lg hover:bg-white/[.08] transition-all"
                    >
                        Home
                    </Link>
                </div>
            </main>
        </div>
    );
}