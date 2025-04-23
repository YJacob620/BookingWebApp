import i18n from "i18next";
import { initReactI18next } from "react-i18next";
// import Backend from 'i18next-http-backend'
// import resourcesToBackend from "i18next-resources-to-backend";

const isDev = import.meta.env.DEV;

i18n
  .use(initReactI18next)
  // .use(
  //   resourcesToBackend(
  //     (language: any, namespace: any) =>
  //       import(`../i18n/${language}/${namespace}.json`)
  //   )
  // )
  .init({
    debug: isDev, // Enable logging for development
    fallbackLng: "en", // Default language
    saveMissing: isDev, // you should not use saveMissing in production
    resources: {
      en: {
        translation: {
          unVerEmail: "Your email address hasn't been verified yet.",
          resendVerEmail: "Resend Verification Email",
          inputEmailPlcHldr: "Enter your email",
          forgotPassword: "Forgot password",
          "logging in": "logging in",
          "cont guest": "Continue as Guest",
          "no account?": "Don't have an account?",
          loginExplain: "Sign in to access the scheduling system.",
          sendingVerEmail: "Sending verification email",
          verEmailSent: "Verification email sent! Please check your inbox.",
          enterPassword: "Enter your password",
          "Register here": "Register here",
          Login: "Login",
          Email: "Email",
          sending: "Sending...",
          "Send Reset Link": "Send Reset Link",
          "Back to Login": "Back to Login",
          "Booking Details": "Booking Details",
          emailSubTogCheck: "You have been subscribed to email notifications",
          emailSubTogUnCheck: "You have been subscribed to email notifications",
          "Email Notifications": "Email Notifications",
          Logout: "Logout",
          noItemsMatchFilter: "No items match your current filters.",
          msgReciveEmailNotif: {
            enabled:
              "You will receive email notifications about bookings and updates",
            disabled:
              "You will not receive any email notifications from the system",
          },
          Loading: "Loading {{what}}...",
          "booking details": "booking details",
          Dashboard: "Dashboard",
          "User Answers For Filter-Questions":
            "User Answers For Filter-Questions",
          noAddonInfo:
            "No additional information was provided for this booking.",
          "No booking details available": "No booking details available",
          Close: "Close",
          language: "language",
          alert: {
            paswrdresetsuccses:
              "If an account exists with that email, we've sent password\nreset instructions. Please check your inbox.",
          },
          explain: {
            ifDontRecieveEmail:
              "If you don't receive an email within a few minutes, check your \nspam folder or make sure you entered the correct email address.",
          },
          Password: "Password",
          "Name is required": "Name is required",
          "Email is required": "Email is required",
          "Password is required": "Password is required",
          errPaswrdlngth: "Password must be at least 8 characters",
          "Passwords do not match": "Passwords do not match",
          "Please select a role": "Please select a role",
          "Create an Account": "Create an Account",
          registraionPageExplaintion:
            "Register to access the infrastructure booking system",
          Name: "Name",
          "Create a password": "Create a password",
          "Confirm Password": "Confirm Password",
          "Confirm your password": "Confirm your password",
          Role: "Role",
          "Select your role": "Select your role",
          Student: "Student",
          Faculty: "Faculty",
          Registering: "Registering",
          Register: "Register",
          questHaveAcc: "Already have an account?",
          "Log in": "Log in",
          "Enter your name": "Enter your name",
          "Enter your email": "Enter your email",
        },
      },
      he: {
        translation: {
          unVerEmail: 'כתובת הדוא"ל שלך עדיין לא אומת',
          resendVerEmail: 'שלח שוב דוא"ל אימות',
          Email: 'דוא"ל',
          inputEmailPlcHldr: 'הכנס את כתובת הדוא"ל שלך',
          forgotPassword: "שכחתי סיסמה",
          "logging in": "נכנס",
          Login: "כניסה",
          "cont guest": "המשך כמשתמש אורח",
          "no account?": "אין לך משתמש קיים?",
          loginExplain: "מלא שם משתמש וסיסמה בשביל להיכנס למערכת",
          sendingVerEmail: 'שולח דוא"ל אימות',
          verEmailSent: 'דוא"ל האימות נשלח, אנא בדוק את תיבת הדואר שלך',
          enterPassword: "הכנס סיסמה",
          "Register here": "הרשם כאן",
          sending: "שולח...",
          "Send Reset Link": "שלח קישור לאיתחול",
          "Back to Login": "חזרה לעמוד כניסה",
          "Booking Details": "פרטי הזמנה",
          emailSubTogCheck: 'נרשמת לקבלת הודעות דרך דוא"ל',
          emailSubTogUnCheck: 'ביטלת רישום לקבלת הודעות דרך דוא"ל',
          "Email Notifications": 'הודעות דוא"ל',
          Logout: "יציאה",
          noItemsMatchFilter: "שום פריט תואם את הפילטר הנוכחי",
          msgReciveEmailNotif: {
            enabled: 'את/ה תקבל/י הודעות בדוא"ל על הזמנות ועדכונים',
            disabled: 'את/ה לא תקבל/י הודעות בדוא"ל על הזמנות ועדכונים',
          },
          Loading: "טוען {{what}}...",
          "booking details": "פרטי הזמנה",
          Dashboard: "תפריט",
          "User Answers For Filter-Questions": "תשובות משתמש על שאלות פילטור",
          noAddonInfo: "לא סופק מידע נוסף על הזמנה זו",
          "No booking details available": "פרטי הזמנה אינם זמינים",
          Close: "סגור",
          language: "שפה",
          alert: {
            paswrdresetsuccses:
              'אם קיים חשבון עם הדוא"ל הזה,\n שלחנו אליו הוראות לאיפוס סיסמה. נא בדוק דואר נכנס',
          },
          explain: {
            ifDontRecieveEmail:
              'אם את/ה לא מקבל/ת דוא"ל נכנס בדקות הקרובות\n בדוק את תיקיית הספאם ודאג שהקלדת את הכתובת הנכונה',
          },
          Password: "סיסמה",
          "Name is required": "נא הכנס שם משתמש",
          "Email is required": 'נא הכנס כתובת דוא"ל',
          "Password is required": "נא הכנס סיסמה",
          errPaswrdlngth: "הסיסמה חייבת להיות בעלת 8 תווים לפחות",
          "Passwords do not match": "הסיסמאות לא תואמות",
          "Please select a role": "נא בחר תפקיד",
          "Create an Account": "צור חשבון",
          registraionPageExplaintion: "הרשם כדי לקבל גישה למערכת הזמנות",
          Name: "שם",
          "Create a password": "צור סיסמה",
          "Confirm Password": "חזור על הסיסמה",
          "Confirm your password": "חזור על סיסמתך",
          Role: "תפקיד",
          "Select your role": "ךבחר את תפקיד",
          Student: "סטודנט",
          Faculty: "איש צוות",
          Registering: "בתהליך רישום",
          Register: "הרשם",
          questHaveAcc: "?ברשותך חשבון קיים",
          "Log in": "הכנס",
          "Enter your name": "הכנס את שמך",
          "Enter your email": 'הכנס כתובת דוא"ל',
        },
      },
    },
  });

i18n.services.formatter?.add("lowercase", (value) => {
  return value.toLowerCase();
});

i18n.services.formatter?.add("sentence_start", (value, lng) => {
  let txt = value;
  if ((lng = "en")) txt = txt.toLocaleUpperCase();
  return txt;
});
