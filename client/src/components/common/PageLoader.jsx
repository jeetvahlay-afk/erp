import WaveLoader from './WaveLoader';

const PageLoader = ({ label = 'Loading workspace…' }) => (
  <div
    className="min-h-screen w-full flex flex-col items-center justify-center p-8 bg-[#f8fafc] dark:bg-[#0b0f17] select-none"
    role="status"
    aria-live="polite"
  >
    <WaveLoader label={label} size="lg" />
  </div>
);

export default PageLoader;
