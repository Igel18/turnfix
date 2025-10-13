import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  CogIcon,
  ChartBarIcon,
  UserGroupIcon,
  TrophyIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  ScaleIcon
} from '@heroicons/react/24/outline'

export function Home() {
  const { t } = useTranslation()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 lg:py-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo/Icon */}
          <div className="mb-6 flex justify-center">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-2xl">
              <TrophyIcon className="h-16 w-16 text-white" />
            </div>
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            {t('home.welcome')}
          </h1>
          
          <p className="text-xl lg:text-2xl text-gray-600 mb-4 leading-relaxed">
            {t('home.description')}
          </p>
          
          <p className="text-lg text-gray-500 mb-10">
            {t('home.subtitle')}
          </p>

          {/* Main Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link 
              to="/management" 
              className="group bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <ChartBarIcon className="h-5 w-5" />
              {t('home.enterManagementCenter')}
              <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link 
              to="/events" 
              className="group bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <ClipboardDocumentListIcon className="h-5 w-5" />
              {t('home.viewEvents')}
            </Link>
          </div>

          {/* Secondary Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a 
              href="http://localhost:5174" 
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <ScaleIcon className="h-5 w-5" />
              {t('home.juryPortal')}
              <ArrowRightIcon className="h-4 w-4" />
            </a>
            
            <Link 
              to="/configuration" 
              className="group bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <CogIcon className="h-5 w-5" />
              {t('home.configuration')}
            </Link>
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <ShieldCheckIcon className="h-4 w-4" />
              {t('home.authNote')}
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              {t('home.features.competition.title')}
            </h3>
            <p className="text-gray-600">
              {t('home.features.competition.description')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <SparklesIcon className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              {t('home.features.scoring.title')}
            </h3>
            <p className="text-gray-600">
              {t('home.features.scoring.description')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              {t('home.features.participants.title')}
            </h3>
            <p className="text-gray-600">
              {t('home.features.participants.description')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100">
            <div className="bg-amber-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <TrophyIcon className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">
              {t('home.features.results.title')}
            </h3>
            <p className="text-gray-600">
              {t('home.features.results.description')}
            </p>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="mt-20 bg-white rounded-2xl shadow-xl p-8 lg:p-12 max-w-5xl mx-auto border border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <GlobeAltIcon className="h-8 w-8 text-blue-600" />
                {t('home.about.title')}
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                {t('home.about.description')}
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="bg-blue-100 p-1 rounded">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">{t('home.about.feature1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-blue-100 p-1 rounded">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">{t('home.about.feature2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-blue-100 p-1 rounded">
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">{t('home.about.feature3')}</span>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <ScaleIcon className="h-8 w-8 text-purple-600" />
                {t('home.jury.title')}
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                {t('home.jury.description')}
              </p>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-900 mb-3">
                  {t('home.jury.info')}
                </p>
                <p className="text-xs text-purple-700 mb-3 italic">
                  💡 {t('home.jury.networkNote')}
                </p>
                <a 
                  href="http://localhost:5174"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                >
                  {t('home.jury.openPortal')}
                  <ArrowRightIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 text-center max-w-2xl mx-auto">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              {t('home.help.title')}
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              {t('home.help.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a 
                href="https://github.com/Igel18/turnfix"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                {t('home.help.github')}
              </a>
              <span className="text-blue-400">•</span>
              <span className="text-sm text-blue-600">
                {t('home.help.version', { version: '2.0.0' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white/50">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            {t('home.footer.license')} • {t('home.footer.created')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Home
