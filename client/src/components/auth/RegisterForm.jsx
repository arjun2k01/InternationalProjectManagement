import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";

import Button from "../common/Button";
import Input from "../common/Input";

function validate(values) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  } else if (values.name.trim().length < 2 || values.name.trim().length > 50) {
    errors.name = "Name must be between 2 and 50 characters.";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function RegisterForm({ authStore }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setApiError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!authStore?.register) {
      setApiError("Auth store is not connected.");
      return;
    }

    try {
      setSubmitting(true);
      await authStore.register(form.name.trim(), form.email.trim(), form.password);
      toast.success("Account created successfully.");
      navigate("/projects", { replace: true });
    } catch (error) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to create account.";
      setApiError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">ProjectFlow</p>
        <h2 className="text-2xl font-semibold text-slate-900">Create account</h2>
        <p className="text-sm text-slate-500">
          Set up your workspace access and start collaborating in real time.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
          label="Full name"
          value={form.name}
          onChange={updateField("name")}
          error={errors.name}
          placeholder="Jane Doe"
          autoComplete="name"
        />

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={updateField("email")}
          error={errors.email}
          placeholder="you@company.com"
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={updateField("password")}
          error={errors.password}
          placeholder="Create a password"
          autoComplete="new-password"
        />

        <Input
          label="Confirm password"
          type="password"
          value={form.confirmPassword}
          onChange={updateField("confirmPassword")}
          error={errors.confirmPassword}
          placeholder="Repeat your password"
          autoComplete="new-password"
        />

        {apiError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {apiError}
          </div>
        ) : null}

        <Button type="submit" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-slate-900 underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
