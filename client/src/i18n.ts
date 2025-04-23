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
          "Reset Password": "Reset Password",
          "Enter your new password": "Enter your new password",
          psswrdResetSuccess: {
            msg: "Your password has been reset successfully!",
            redir: "You will be redirected to the login page shortly.",
            redirfail:
              "If you're not redirected, you can manually return to the login page.",
          },
          "New Password": "New Password",
          "Enter new password": "Enter new password",
          pswrdChrsNumMsg: "Password must be at least 8 characters",
          "Confirm New Password": "Confirm New Password",
          Resetting: "Resetting...",
          "Back to": "Back to {{where}}",
          verPendPg: {
            title: "Verify Your Email",
            chkinbx: "Check Your Inbox",
            spmchk: "If you don't see the email, check your spam folder.",
            succsesMsg: "Verification email has been resent successfully!",
            sentMsg: "We've sent a verification email to:",
          },
          "your email address": "_NOT_TRANSLATED_",
          emailVerPg: {
            title: "Email Verification",
            verifying: "Verifying your email address...",
            succses: "Email Verified Successfully!",
            confirm:
              "Your email has been verified and your account is now active.",
            redir: "You will be redirected to the dashboard automatically...",
            fail: "Verification Failed",
            failExplain: "The verification link may be invalid or expired.",
            requestNew: "Request New Verification Email",
          },
          "Go to Login": "Go to Login",
          Resending: "Resending...",
          "Resend Verification Email": "Resend Verification Email",
          "Return to": "Return to {{where}}",
          "Forgot password": "Forgot password",
          forgotPassPgTitle: "Forgot Password",
          forgotPassPgexplain:
            "Enter your email to receive a password reset link",
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
          "Reset Password": "אפס סיסמה",
          "Enter your new password": "הזן את הסיסמה החדשה שלך",
          psswrdResetSuccess: {
            msg: "הסיסמה שלך אותחלה בהצלחה!",
            redir: "תופנה מחדש לדף הכניסה בקרוב.",
            redirfail: "אם אינך מופנה, אתה יכול לחזור ידנית לדף הכניסה.",
          },
          "New Password": "סיסמה חדשה",
          "Enter new password": "הזן סיסמה חדשה",
          pswrdChrsNumMsg: "הסיסמה חייבת להכיל לפחות 8 תווים",
          "Confirm New Password": "אשר סיסמא חדשה",
          Resetting: "איפוס ...",
          "Back to": "חזרה ל {{where}}",
          verPendPg: {
            title: 'אמת את הדוא"ל שלך',
            chkinbx: "בדוק את תיבת הדואר הנכנס שלך",
            spmchk: 'אם אינך רואה את הדוא"ל, בדוק את תיקיית הספאם שלך.',
            succsesMsg: 'דוא"ל אימות התמרמר בהצלחה!',
            sentMsg: 'שלחנו דוא"ל אימות ל:',
          },
          "your email address": 'כתובת הדוא"ל שלך',
          emailVerPg: {
            title: 'אימות דוא"ל',
            verifying: 'מאמת את כתובת הדוא"ל שלך ...',
            succses: 'דוא"ל מאומת בהצלחה!',
            confirm: 'הדוא"ל שלך אומת וחשבונך פעיל כעת.',
            redir: "תופנה אל תפריט הבית באופן אוטומטי ...",
            fail: "האימות נכשל",
            failExplain: "קישור האימות עשוי להיות לא חוקי או שפג תוקפו.",
            requestNew: 'בקש דוא"ל אימות חדש',
          },
          "Go to Login": "עבור לדף כניסה",
          Resending: "נוהג ...",
          "Resend Verification Email": 'הודע בדוא"ל אימות מחדש',
          "Return to": "חזור ל {{where}}",
          "Forgot password": "שכחתי סיסמה",
          forgotPassPgTitle: "איפוס סיסמה",
          forgotPassPgexplain:
            'הכנס את כתובת הדוא"ל שלך כדי לקבל לינק לאיפוס הסיסמה',
        },
      },
    },
  });

i18n.services.formatter?.add("lowercase", (value) => {
  return value.toLowerCase();
});

i18n.services.formatter?.add("sentence_start", (value, lng) => {
  let txt = value;
  if (lng == "en") txt = txt.toLocaleUpperCase();
  return txt;
});
