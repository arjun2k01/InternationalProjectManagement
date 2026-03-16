import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import Button from "../common/Button";
import Input from "../common/Input";
import Modal from "../common/Modal";

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreate,
  projectStore,
}) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm({ name: "", description: "" });
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Project name is required.";
    } else if (form.name.trim().length > 100) {
      nextErrors.name = "Project name must be 100 characters or fewer.";
    }

    if (form.description.length > 500) {
      nextErrors.description = "Description must be 500 characters or fewer.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const createAction = onCreate || projectStore?.createProject;

    if (!createAction) {
      toast.error("Create project action is not configured.");
      return;
    }

    try {
      setSubmitting(true);
      await createAction({
        name: form.name.trim(),
        description: form.description.trim(),
      });
      toast.success("Project created successfully.");
      onClose?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.error?.message ||
          error?.message ||
          "Unable to create project."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create project"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-project-form" loading={submitting}>
            Create project
          </Button>
        </div>
      }
    >
      <form id="create-project-form" onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Project name"
          value={form.name}
          onChange={handleChange("name")}
          error={errors.name}
          placeholder="Launch planning dashboard"
        />

        <Input
          label="Description"
          type="textarea"
          rows={5}
          value={form.description}
          onChange={handleChange("description")}
          error={errors.description}
          placeholder="Add a short summary of the project scope and goals."
        />
      </form>
    </Modal>
  );
}
