import { useState } from "react";
import options from "../data/options.json";

const LABELS = {
  brand: "Merek",
  brand_type: "Tipe",
  machine_type: "Transmisi",
  location: "Lokasi",
  year: "Tahun",
  km_1: "Kilometer (pembacaan 1)",
  km_2: "Kilometer (pembacaan 2, opsional)",
};

const empty = { brand: "", brand_type: "", machine_type: "", location: "", year: "", km_1: "", km_2: "" };

function validate(v) {
  const errors = {};
  for (const k of ["brand", "brand_type", "machine_type", "location"]) {
    if (!v[k].trim()) errors[k] = `${LABELS[k]} wajib diisi.`;
  }
  const year = Number(v.year);
  if (!v.year) errors.year = "Tahun wajib diisi.";
  else if (!Number.isInteger(year) || year < options.year_min || year > options.year_max) {
    errors.year = `Tahun harus ${options.year_min} sampai ${options.year_max}.`;
  }
  const km1 = v.km_1 === "" ? null : Number(v.km_1);
  const km2 = v.km_2 === "" ? null : Number(v.km_2);
  if (km1 === null && km2 === null) errors.km_1 = "Isi minimal satu pembacaan kilometer.";
  for (const [k, n] of [["km_1", km1], ["km_2", km2]]) {
    if (n !== null && (!Number.isFinite(n) || n < 0 || !Number.isInteger(n))) errors[k] = "Kilometer harus bilangan bulat 0 atau lebih.";
  }
  return errors;
}

function Field({ id, label, error, children, hint }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-bold">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-sm text-muted" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="mt-1 text-[0.9rem] font-semibold text-rust" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}

export function VehicleForm({ onSubmit, loading }) {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    onSubmit({
      brand: values.brand.trim(),
      brand_type: values.brand_type.trim(),
      machine_type: values.machine_type,
      location: values.location,
      year: Number(values.year),
      km_1: values.km_1 === "" ? null : Number(values.km_1),
      km_2: values.km_2 === "" ? null : Number(values.km_2),
    });
  };

  const inputProps = (id) => ({
    id,
    className: "field-input",
    "aria-invalid": errors[id] ? "true" : undefined,
    "aria-describedby": errors[id] ? `${id}-error` : `${id}-hint`,
  });

  return (
    <form onSubmit={submit} noValidate aria-label="Formulir data kendaraan">
      <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-5">
        <Field id="brand" label="Merek" error={errors.brand}>
          <select {...inputProps("brand")} value={values.brand} onChange={set("brand")}>
            <option value="">Pilih merek</option>
            {options.brand.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field id="brand_type" label="Tipe" error={errors.brand_type} hint="Tulis tipe lengkap, contoh: City 1.5 E Sedan.">
          <input {...inputProps("brand_type")} list="brand-type-list" value={values.brand_type}
            onChange={set("brand_type")} placeholder="cth: City 1.5 E Sedan" autoComplete="off" />
          <datalist id="brand-type-list">
            {options.brand_type_top.map((t) => <option key={t} value={t} />)}
          </datalist>
        </Field>
        <Field id="machine_type" label="Transmisi" error={errors.machine_type}>
          <select {...inputProps("machine_type")} value={values.machine_type} onChange={set("machine_type")}>
            <option value="">Pilih transmisi</option>
            {options.machine_type.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field id="location" label="Lokasi" error={errors.location}>
          <select {...inputProps("location")} value={values.location} onChange={set("location")}>
            <option value="">Pilih lokasi</option>
            {options.location.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field id="year" label="Tahun" error={errors.year}>
          <input {...inputProps("year")} type="number" value={values.year} onChange={set("year")}
            placeholder="cth: 2021" min={options.year_min} max={options.year_max} inputMode="numeric" />
        </Field>
        <Field id="km_1" label="Kilometer (1)" error={errors.km_1}>
          <input {...inputProps("km_1")} type="number" value={values.km_1} onChange={set("km_1")}
            placeholder="cth: 45000" min="0" step="1" inputMode="numeric" />
        </Field>
        <Field id="km_2" label="Kilometer (2, opsional)" error={errors.km_2}>
          <input {...inputProps("km_2")} type="number" value={values.km_2} onChange={set("km_2")}
            placeholder="cth: 45000" min="0" step="1" inputMode="numeric" />
        </Field>
      </div>
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Menghitung..." : "Hitung estimasi"}
      </button>
    </form>
  );
}
