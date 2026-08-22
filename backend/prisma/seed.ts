import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const SEED_PASSWORD = "Password123!";

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  const passwordHash = await hash(SEED_PASSWORD);

  const admin = await prisma.user.create({
    data: {
      email: "admin@clinic.test",
      passwordHash,
      role: Role.ADMIN,
      name: "Priya Nair",
      phone: "+91-9000000001",
    },
  });

  const doctorOne = await prisma.user.create({
    data: {
      email: "dr.mehta@clinic.test",
      passwordHash,
      role: Role.DOCTOR,
      name: "Dr. Arjun Mehta",
      phone: "+91-9000000002",
      doctorProfile: {
        create: {
          specialisation: "Cardiology",
          slotDurationMin: 20,
          workingHours: {
            mon: ["09:00-13:00", "14:00-17:00"],
            tue: ["09:00-13:00", "14:00-17:00"],
            wed: ["09:00-13:00", "14:00-17:00"],
            thu: ["09:00-13:00", "14:00-17:00"],
            fri: ["09:00-13:00"],
          },
        },
      },
    },
  });

  const doctorTwo = await prisma.user.create({
    data: {
      email: "dr.rao@clinic.test",
      passwordHash,
      role: Role.DOCTOR,
      name: "Dr. Sunita Rao",
      phone: "+91-9000000003",
      doctorProfile: {
        create: {
          specialisation: "Dermatology",
          slotDurationMin: 30,
          workingHours: {
            mon: ["10:00-13:00"],
            wed: ["10:00-13:00", "15:00-18:00"],
            fri: ["10:00-13:00", "15:00-18:00"],
          },
        },
      },
    },
  });

  const patients = [
    { email: "asha.patient@clinic.test", name: "Asha Kulkarni", dob: new Date("1990-04-12") },
    { email: "rohan.patient@clinic.test", name: "Rohan Verma", dob: new Date("1985-11-02") },
    { email: "meera.patient@clinic.test", name: "Meera Iyer", dob: new Date("1998-07-23") },
  ];

  for (const [index, patient] of patients.entries()) {
    await prisma.user.create({
      data: {
        email: patient.email,
        passwordHash,
        role: Role.PATIENT,
        name: patient.name,
        phone: `+91-900000001${index}`,
        patientProfile: {
          create: {
            dob: patient.dob,
          },
        },
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  Admin:    ${admin.email}`);
  console.log(`  Doctors:  ${doctorOne.email}, ${doctorTwo.email}`);
  console.log(`  Patients: ${patients.map((p) => p.email).join(", ")}`);
  console.log(`  Password for all seeded users: ${SEED_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
