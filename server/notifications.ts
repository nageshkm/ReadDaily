import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let adminApp: admin.app.App | null = null;

export const initializeFirebaseAdmin = () => {
  if (adminApp) return adminApp;

  try {
    // Initialize with service account key
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('Firebase Admin initialized successfully');
    return adminApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    return null;
  }
};

interface NotificationData {
  title: string;
  body: string;
  url?: string;
  articleId?: string;
  userId?: string;
}

export const sendNotificationToUser = async (
  fcmToken: string, 
  data: NotificationData
): Promise<boolean> => {
  const app = initializeFirebaseAdmin();
  if (!app) {
    console.error('Firebase Admin not initialized');
    return false;
  }

  try {
    const message = {
      notification: {
        title: data.title,
        body: data.body,
      },
      data: {
        url: data.url || '/',
        articleId: data.articleId || '',
        userId: data.userId || '',
        clickAction: data.url || '/',
      },
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

export const sendNotificationForLike = async (
  authorFcmToken: string,
  likerName: string,
  articleTitle: string,
  articleId: string
): Promise<boolean> => {
  return sendNotificationToUser(authorFcmToken, {
    title: 'ReadDaily',
    body: `${likerName} liked your article`,
    url: `/profile?tab=articles`,
    articleId,
    userId: '',
  });
};

export const sendNotificationForComment = async (
  authorFcmToken: string,
  commenterName: string,
  articleTitle: string,
  articleId: string
): Promise<boolean> => {
  return sendNotificationToUser(authorFcmToken, {
    title: 'ReadDaily',
    body: `${commenterName} commented on your article`,
    url: `/profile?tab=articles`,
    articleId,
    userId: '',
  });
};