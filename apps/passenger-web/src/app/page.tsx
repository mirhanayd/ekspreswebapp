import { StatusBadge } from '@ekspres/ui';
import { ApplicationStatus } from '@ekspres/contracts';

import { Search, Calendar, MapPin } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative bg-blue-900 text-white flex-1 flex items-center justify-center py-20 px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 max-w-4xl w-full mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Güvenli ve Konforlu Yolculuk
            </h1>
            <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
              Siirt Kurtalan Ekspres ile Türkiye'nin her yerine güvenle seyahat edin.
            </p>
          </div>

          {/* Search Card */}
          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-2xl max-w-4xl mx-auto">
            <form className="grid grid-cols-1 md:grid-cols-4 gap-4" action="/search">
              {/* Origin */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nereden</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="originId"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50 appearance-none"
                  >
                    <option value="">Kalkış noktası seçin</option>
                    <option value="siirt">Siirt</option>
                    <option value="kurtalan">Kurtalan</option>
                    <option value="batman">Batman</option>
                    <option value="diyarbakir">Diyarbakır</option>
                  </select>
                </div>
              </div>

              {/* Destination */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nereye</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    name="destinationId"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50 appearance-none"
                  >
                    <option value="">Varış noktası seçin</option>
                    <option value="siirt">Siirt</option>
                    <option value="kurtalan">Kurtalan</option>
                    <option value="batman">Batman</option>
                    <option value="diyarbakir">Diyarbakır</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="date"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="h-5 w-5" />
                  Sefer Ara
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Modern Filo', desc: 'Son model araçlarla konforlu ve güvenli yolculuk.' },
            { title: '7/24 Destek', desc: 'Yolculuğunuzun her anında yanınızdayız.' },
            { title: 'Kolay Rezervasyon', desc: 'Hızlı ve güvenli online bilet alma deneyimi.' },
          ].map((feature, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm text-center space-y-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                {i + 1}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
