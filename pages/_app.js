import Head from 'next/head';
import { JournalProvider } from '../context/JournalContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <JournalProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>MindText Journal</title>
        <meta
          name="description"
          content="MindText is a lightweight journaling companion that helps you reflect and resurface insights."
        />
      </Head>
      <Component {...pageProps} />
    </JournalProvider>
  );
}
