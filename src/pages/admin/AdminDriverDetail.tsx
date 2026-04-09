import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motionTokens } from "@/lib/tokens/motion-tokens";

const fadeIn = motionTokens.variants.fadeIn;
const fadeUp = motionTokens.variants.fadeUp;
const sectionStaggerParent = { hidden: {}, visible: { transition: { staggerChildren: motionTokens.stagger.section } } } as const;

interface DriverData {
  id: string;
  profile_id: string;
  license_number: string | null;
  license_type: string | null;
  license_expiry: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  base_daily_wage: number | null;
  city: string | null;
  profiles: { display_name: string; username: string } | null;
}

async function fetchDriver(profileId: string): Promise<DriverData | null> {
  const { data, error } = await supabase
    .from("drivers")
    .select(
      "id, profile_id, license_number, license_type, license_expiry, emergency_contact_name, emergency_contact_phone, base_daily_wage, city, profiles:profile_id ( display_name, username )"
    )
    .eq("profile_id", profileId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no row
    throw error;
  }
  return data as DriverData;
}

export default function AdminDriverDetail() {
  const navigate = useNavigate();
  const { id: profileId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [baseDailyWage, setBaseDailyWage] = useState("");
  const [city, setCity] = useState("");

  const driverQuery = useQuery({
    queryKey: ["driver-detail", profileId],
    queryFn: () => fetchDriver(profileId!),
    enabled: !!profileId,
  });

  const driver = driverQuery.data;

  useEffect(() => {
    if (driver) {
      setLicenseNumber(driver.license_number ?? "");
      setLicenseType(driver.license_type ?? "");
      setLicenseExpiry(driver.license_expiry ?? "");
      setEmergencyContactName(driver.emergency_contact_name ?? "");
      setEmergencyContactPhone(driver.emergency_contact_phone ?? "");
      setBaseDailyWage(driver.base_daily_wage?.toString() ?? "");
      setCity(driver.city ?? "");
    }
  }, [driver]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!driver) {
        // Create driver row if it doesn't exist (pre-migration driver)
        const wageNum = parseFloat(baseDailyWage);
        const { error } = await supabase.from("drivers").insert({
          profile_id: profileId!,
          license_number: licenseNumber.trim() || null,
          license_type: licenseType.trim() || null,
          license_expiry: licenseExpiry || null,
          emergency_contact_name: emergencyContactName.trim() || null,
          emergency_contact_phone: emergencyContactPhone.trim() || null,
          base_daily_wage: !isNaN(wageNum) && wageNum >= 0 ? wageNum : null,
          city: city.trim() || null,
        });
        if (error) throw error;
      } else {
        const wageNum = parseFloat(baseDailyWage);
        const { error } = await supabase
          .from("drivers")
          .update({
            license_number: licenseNumber.trim() || null,
            license_type: licenseType.trim() || null,
            license_expiry: licenseExpiry || null,
            emergency_contact_name: emergencyContactName.trim() || null,
            emergency_contact_phone: emergencyContactPhone.trim() || null,
            base_daily_wage: !isNaN(wageNum) && wageNum >= 0 ? wageNum : null,
            city: city.trim() || null,
          })
          .eq("id", driver.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-detail", profileId] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Driver details saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  if (driverQuery.isLoading) {
    return (
      <motion.div
        key="loading"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={fadeIn}
        className="max-w-2xl space-y-4 py-4"
        aria-busy
        aria-label="Loading driver"
      >
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </motion.div>
    );
  }

  const displayName = driver?.profiles?.display_name ?? "Driver";
  const username = driver?.profiles?.username ?? "";

  return (
    <motion.div
      key="content"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeIn}
      className="max-w-2xl space-y-6"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/users")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {displayName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {username ? `@${username} — ` : ""}Driver Details
          </p>
        </div>
      </div>

      {!driver && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-sm text-amber-700 bg-amber-50 rounded-xl p-4"
        >
          No driver record found for this profile. Fill in the details below and save to create one.
        </motion.div>
      )}

      <motion.form
        key="content"
        initial="hidden"
        animate="visible"
        variants={sectionStaggerParent}
        className="space-y-6"
        onSubmit={handleSubmit}
      >
        {/* License */}
        <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">License Information</h2>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. DL12345678"
                  className="h-10 rounded-xl bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>License Type</Label>
                <Input
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value)}
                  placeholder="e.g. CDL-A, Class C"
                  className="h-10 rounded-xl bg-secondary/50 border-border"
                />
              </div>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label>License Expiry</Label>
              <Input
                type="date"
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
          </div>
        </motion.div>

        {/* Emergency contact */}
        <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Emergency Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="e.g. +1 555-123-4567"
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
          </div>
        </motion.div>

        {/* Compensation & location */}
        <motion.div variants={fadeUp} className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Compensation & Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Daily Wage</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={baseDailyWage}
                onChange={(e) => setBaseDailyWage(e.target.value)}
                placeholder="0.00"
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Houston"
                className="h-10 rounded-xl bg-secondary/50 border-border"
              />
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div variants={fadeUp} className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/users")}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Details
          </Button>
        </motion.div>
      </motion.form>
    </motion.div>
  );
}
