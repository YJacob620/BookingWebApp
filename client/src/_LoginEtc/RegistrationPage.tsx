import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Message, register, RegistrationFormData } from "@/utils";
import { LOGIN, VERIFICATION_PENDING } from "@/RoutePaths";
import BasePageLayout from "@/components/_BasePageLayout";
import { useTranslation } from "react-i18next";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
}

const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegistrationFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { t,i18n } = useTranslation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear specific error when user corrects input
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
    }));

    // Clear role error if present
    if (errors.role) {
      setErrors((prev) => ({
        ...prev,
        role: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = t("Name is required");
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = t("Password is required");
    } else if (formData.password.length < 8) {
      newErrors.password = t(
        "errPaswrdlngth",
        "Password must be at least 8 characters"
      );
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t(
        "Passwords do not match",
        "Passwords do not match"
      );
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = t("Please select a role", "Please select a role");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Form validation
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Use the imported register utility
      const result = await register(formData);

      if (result.success) {
        // Clear form
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "student",
        });

        // Redirect to verification pending page
        navigate(VERIFICATION_PENDING, {
          state: {
            email: formData.email,
            message: result.data.message,
          },
        });
      } else {
        setMessage({
          type: "error",
          text: result.data.message || "Registration failed. Please try again.",
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BasePageLayout
      pageTitle={t("Create an Account")}
      explanationText={t('registraionPageExplaintion')}
      alertMessage={message}
    >
      <Card className="card1 pt-4">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Name','Name')}</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                placeholder={t("Enter your name")}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('Email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder={t("Enter your email","Enter your email")}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('Password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder={t("Create a password","Create a password")}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
              <p className="text-xs explanation-text1" dir={i18n.dir()}>
                <Info className="inline mr-1 h-3 w-3" />
                {" "}
                {t("errPaswrdlngth")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t("Confirm Password","Confirm Password")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder={t("Confirm your password")}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('Role','Role')}</Label>
              <Select value={formData.role} onValueChange={handleSelectChange} dir={i18n.dir()}>
                <SelectTrigger
                  id="role"
                  className={errors.role ? "border-red-500" : ""}
                >
                    
                  <SelectValue placeholder= {t("Select your role")}/>
                </SelectTrigger>
                <SelectContent className="card1">
                  <SelectItem value="student">{t('Student','Student')}</SelectItem>
                  <SelectItem value="faculty">{t('Faculty','Faculty')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-red-500 text-sm mt-1">{errors.role}</p>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full apply" dir={i18n.dir()}>
              {}
              {isLoading
                ? t("Registering") + "..."
                : t("Register")}
            </Button>

            <div className="text-center mt-4">
              <p className="explanation-text1" dir={i18n.dir()}>
                {t("questHaveAcc", "Already have an account?")}
                {/* Already have an account?{" "} */}
                {" "}
                <Link to={LOGIN} className="link">
                  {/* Log in */}
                  {t("Log in")}
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </BasePageLayout>
  );
};

export default RegistrationPage;
