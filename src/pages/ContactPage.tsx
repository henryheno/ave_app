
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Assuming the portrait image is placed in the public folder as 'henro.webp'
export function ContactPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col items-center pt-12 pb-12 font-sans relative">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] left-[-20%] w-[500px] h-[500px] bg-[#FF3D71]/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-30%] right-[-20%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-3xl mx-auto px-4 z-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour
        </button>
        <h1 className="text-3xl font-bold mb-4 text-center">Contacter les développeurs</h1>
        <div className="bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <img loading="lazy"
              src="/henro.webp"
              alt="Portrait de Henro"
              className="w-48 h-48 rounded-full object-cover border border-white/20"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-2">Henro</h2>
              <p className="text-gray-300 mb-4">
                Développeur principal du projet APA. Passionné par la technologie, la spiritualité et le développement d'applications
                accessibles. Auteur de plusieurs modules clés et fervent défenseur d'une interface utilisateur premium.
              </p>
              <p className="text-gray-400 mb-2">
                 <a href="mailto:henro@example.com" className="underline hover:text-white">henro@example.com</a>
              </p>
              <p className="text-gray-400">
                <a href="https://github.com/henro" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">GitHub</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
