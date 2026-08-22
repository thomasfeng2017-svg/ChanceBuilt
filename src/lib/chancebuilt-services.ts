import type { ServiceCategory } from "@prisma/client";

/**
 * ChanceBuilt's service list, as Chance supplied it.
 *
 * Lives here rather than in the import script because two things load it: the
 * script, and the "Load service list" action in the admin. Keeping one copy
 * means the button and the script can never disagree about what the list is.
 *
 * Prices are deliberately absent. Chance gave none, and the site renders a
 * service without one as "Quote, after review", which is honest. A made-up
 * number on a brake job is a number a customer will hold him to.
 *
 * Durations are estimates and matter more than they look: slot length is what
 * stops the booking calendar handing out two appointments for one bay. They
 * lean long on purpose, so the failure is an empty slot rather than a double
 * booking, and Chance can correct them per service in the admin.
 */
export type ChancebuiltService = {
  name: string;
  category: ServiceCategory;
  blurb: string;
  description: string;
  minutes: number;
};

/** A nominal drop-off slot, for jobs where the car stays and the appointment
 *  is really just the hand-over. */
const DROP_OFF = 60;

export const CHANCEBUILT_SERVICES: ChancebuiltService[] = [
  // ---- Custom engine calibrations ------------------------------------------
  {
    name: "Custom Tuning",
    category: "TUNING",
    blurb: "Calibration written for your car, not pulled off a shelf.",
    description:
      "A calibration developed for your exact car, fuel and hardware, logged and revised until it is safe and driving the way it should. This is the work the shop is built around.",
    minutes: 240,
  },
  {
    name: "MHD & bootmod3 Flashing",
    category: "TUNING",
    blurb: "Authorised MHD and BM3 dealer, licences and flashing done here.",
    description:
      "ChanceBuilt is an authorised dealer for MHD and bootmod3. We supply the licence, get the platform onto your car and load a base map, which is what has to happen before any custom calibration work.",
    minutes: 120,
  },
  {
    name: "Motive Reflex Tuning",
    category: "TUNING",
    blurb: "Tuning on the Motive Reflex platform.",
    description:
      "Calibration work on the Motive Reflex platform, for the cars and setups it suits better than the alternatives. Ask us which platform makes sense for your build.",
    minutes: 240,
  },

  // ---- Performance upgrades -------------------------------------------------
  {
    name: "Downpipe Installation",
    category: "PERFORMANCE",
    blurb: "Downpipes fitted, with the tune to match.",
    description:
      "Downpipe installation, done properly and followed by the calibration changes it needs. Fitting one without addressing the tune is how people end up with codes and a car that runs worse.",
    minutes: 240,
  },
  {
    name: "Chargepipe Installation",
    category: "PERFORMANCE",
    blurb: "Replacing the part that cracks and dumps your boost.",
    description:
      "Chargepipe replacement, one of the known weak points on these engines once boost goes up. Usually done alongside other bolt-on work.",
    minutes: 120,
  },
  {
    name: "Intake Installation",
    category: "PERFORMANCE",
    blurb: "Intake fitted and checked for real airflow, not noise.",
    description:
      "Intake installation with the fitment and sealing checked properly, so you gain airflow rather than just induction noise and hot air.",
    minutes: 120,
  },
  {
    name: "Intake Manifold Upgrade",
    category: "PERFORMANCE",
    blurb: "Manifold upgrades for cars chasing bigger numbers.",
    description:
      "Upgraded intake manifold installation for builds where the stock manifold has become the restriction. Includes the supporting work to get it sealed and running right.",
    minutes: 300,
  },
  {
    name: "Turbo Upgrade",
    category: "PERFORMANCE",
    blurb: "Stock replacement or upgraded turbos, fitted and calibrated.",
    description:
      "Turbocharger work, whether that is a stock replacement or a step up in size, including the supporting hardware and the calibration once it is together. Multi-day job, so the booking is your drop-off.",
    minutes: DROP_OFF,
  },
  {
    name: "Single Turbo Conversion",
    category: "PERFORMANCE",
    blurb: "Full single turbo builds, start to finish.",
    description:
      "Single turbo conversion including manifold, fuelling, cooling and the calibration to bring it all together. This is a build rather than a job, so it starts with a conversation and a plan.",
    minutes: DROP_OFF,
  },
  {
    name: "Full Exhaust Installation",
    category: "PERFORMANCE",
    blurb: "Turbo-back and cat-back exhaust systems fitted.",
    description:
      "Full exhaust installation, from the turbo back or the cat back, fitted so it sits right and does not drone or knock on the underside of the car.",
    minutes: 240,
  },
  {
    name: "Oil & Cooling Upgrades",
    category: "PERFORMANCE",
    blurb: "Keeping oil and coolant temps down on a tuned car.",
    description:
      "Oil coolers, upgraded radiators, chargecoolers and the rest of the cooling side. The upgrade nobody wants to pay for until the first hot lap or the first summer traffic jam.",
    minutes: 300,
  },
  {
    name: "Fuel System Upgrades",
    category: "PERFORMANCE",
    blurb: "Low pressure and high pressure pumps, and port injection.",
    description:
      "Fuel system work: low pressure fuel pump upgrades, high pressure fuel pump upgrades and port injection installations. Required once power goes beyond what the stock fuelling can feed, particularly on ethanol blends.",
    minutes: 300,
  },

  // ---- Suspension and drivetrain --------------------------------------------
  {
    name: "Lowering Spring Installation",
    category: "SUSPENSION",
    blurb: "Springs supplied and fitted, or fitted if you have them.",
    description:
      "Lowering spring installation. We can supply the springs or fit a set you already have, and we will tell you honestly how the ride and the geometry will change.",
    minutes: 240,
  },
  {
    name: "Coilover Installation",
    category: "SUSPENSION",
    blurb: "Coilovers fitted and set up for how you actually drive.",
    description:
      "Coilover installation and setup, with ride height and damping set for your intended use rather than slammed by default. Tell us whether the car is street, canyon or track.",
    minutes: 300,
  },
  {
    name: "Clutch & Flywheel Replacement",
    category: "SUSPENSION",
    blurb: "Upgraded clutch and flywheel, replaced or installed.",
    description:
      "Clutch and flywheel replacement, including upgraded setups for cars making more power than the stock clutch can hold. Car stays with us, so the booking is your drop-off.",
    minutes: DROP_OFF,
  },
  {
    name: "Driveshaft Installation",
    category: "SUSPENSION",
    blurb: "Driveshaft upgrades and replacements.",
    description:
      "Driveshaft installation, including upgraded shafts for high power builds where the stock item becomes the weak link.",
    minutes: 300,
  },
  {
    name: "Differential Bushing Installation",
    category: "SUSPENSION",
    blurb: "Tightening up the rear end.",
    description:
      "Differential bushing replacement, which cleans up the slop in the rear end and is well worth doing while the car is apart for other drivetrain work.",
    minutes: 300,
  },
  {
    name: "Control Arm Replacement",
    category: "SUSPENSION",
    blurb: "Front end control arms, the usual wear item.",
    description:
      "Control arm replacement, a normal wear item on these cars and one of the first things to check when the front end feels vague or wanders.",
    minutes: 240,
  },

  // ---- Brakes ---------------------------------------------------------------
  {
    name: "Brake Pad Replacement",
    category: "BRAKES",
    blurb: "Pads replaced, sensors included.",
    description:
      "Brake pad replacement including the wear sensors, which BMW makes a single-use item. We will tell you how much life is left in the rotors while we are in there.",
    minutes: 120,
  },
  {
    name: "Brake Rotor Replacement",
    category: "BRAKES",
    blurb: "Rotors replaced, usually alongside pads.",
    description:
      "Brake rotor replacement, normally done with pads so the new pads bed onto a clean surface rather than into someone else's wear pattern.",
    minutes: 180,
  },
  {
    name: "Brake Pad Sensor Replacement",
    category: "BRAKES",
    blurb: "Clearing the brake wear light on its own.",
    description:
      "Brake wear sensor replacement on its own, for cars where the pads are fine but the sensor has triggered.",
    minutes: 60,
  },
  {
    name: "Big Brake Kit Installation",
    category: "BRAKES",
    blurb: "BBK upgrades fitted and bedded in.",
    description:
      "Big brake kit installation, including fitment checks against your wheels, fresh fluid and a proper bedding-in procedure. Worth doing before the track day rather than after.",
    minutes: 300,
  },
  {
    name: "Small Brake Kit Installation",
    category: "BRAKES",
    blurb: "A step up in braking without going full BBK.",
    description:
      "Small brake kit installation, for people who want better braking than stock without the cost or the wheel clearance headaches of a full big brake kit.",
    minutes: 240,
  },
  {
    name: "Brake Fluid Flush",
    category: "BRAKES",
    blurb: "Fresh fluid, which matters more than people think.",
    description:
      "Complete brake fluid flush. Old fluid absorbs water and boils under hard use, which is what a soft pedal halfway through a session actually is. Due every couple of years, sooner if you track the car.",
    minutes: 90,
  },

  // ---- Maintenance ----------------------------------------------------------
  {
    name: "Oil Change",
    category: "MAINTENANCE",
    blurb: "Full synthetic service with an inspection while it is up.",
    description:
      "Full synthetic oil service with an OE filter, plus a look over the car while it is on the lift. We will tell you what we see without trying to sell you a job you do not need.",
    minutes: 60,
  },
  {
    name: "Spark Plug Replacement",
    category: "MAINTENANCE",
    blurb: "Correct heat range for how the car is tuned.",
    description:
      "Spark plug replacement, gapped and heat-ranged for your power level. A tuned car on stock plugs is a car that misfires under boost.",
    minutes: 120,
  },
  {
    name: "Coolant Flush",
    category: "MAINTENANCE",
    blurb: "Fresh coolant, correct BMW spec.",
    description:
      "Complete coolant flush and refill with the correct specification coolant, plus a pressure check of the system while we are in there.",
    minutes: 120,
  },
  {
    name: "Differential Service",
    category: "MAINTENANCE",
    blurb: "Front and rear differential fluid.",
    description:
      "Differential fluid service, front and rear. Frequently skipped, and the reason a lot of high mileage diffs whine.",
    minutes: 120,
  },
  {
    name: "Water Pump & Thermostat",
    category: "MAINTENANCE",
    blurb: "The known cooling failure point on these engines.",
    description:
      "Water pump and thermostat replacement, one of the best known failure points on these engines and much cheaper to do before it strands you than after.",
    minutes: 300,
  },
  {
    name: "Fuel Injector Service",
    category: "MAINTENANCE",
    blurb: "Injectors replaced or serviced.",
    description:
      "Fuel injector replacement or servicing, including the index coding these cars need afterwards. A common cause of rough running and misfires on higher mileage engines.",
    minutes: 240,
  },
  {
    name: "Valve Cover & Gasket Replacement",
    category: "MAINTENANCE",
    blurb: "The usual source of a burning oil smell.",
    description:
      "Valve cover and valve cover gasket replacement. If you can smell oil after a drive and there is nothing on the driveway, this is usually why.",
    minutes: 300,
  },
  {
    name: "Oil Pan Gasket Replacement",
    category: "MAINTENANCE",
    blurb: "The other common oil leak, and a bigger job.",
    description:
      "Oil pan and oil pan gasket work. A bigger job than it sounds on these cars because of what has to come out to reach it, so the booking is your drop-off.",
    minutes: DROP_OFF,
  },
  {
    name: "Timing Chain Replacement",
    category: "MAINTENANCE",
    blurb: "Before it goes, not after.",
    description:
      "Timing chain and guide replacement. On the engines where this is a known issue it is worth doing preventatively, because the failure takes the engine with it. Multi-day job.",
    minutes: DROP_OFF,
  },
  {
    name: "Belt & Pulley Replacement",
    category: "MAINTENANCE",
    blurb: "Belts, tensioners and pulleys as a set.",
    description:
      "Serpentine belt, tensioner and pulley replacement. Done as a set, because replacing a belt and leaving a failing tensioner just moves the problem a few thousand miles down the road.",
    minutes: 180,
  },
  {
    name: "Motor Mount Replacement",
    category: "MAINTENANCE",
    blurb: "Collapsed mounts, and the shake that comes with them.",
    description:
      "Engine mount replacement, including upgraded mounts for higher power cars. Worn mounts show up as vibration at idle and a clunk when you get on and off the throttle.",
    minutes: 300,
  },
  {
    name: "Motor Swap",
    category: "MAINTENANCE",
    blurb: "Full engine replacement or conversion.",
    description:
      "Engine replacement or swap, including the wiring, mounting and calibration work to make it run properly in the car. This starts with a conversation about what you are trying to build.",
    minutes: DROP_OFF,
  },
];

export const serviceSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const CHANCEBUILT_SERVICE_SLUGS = CHANCEBUILT_SERVICES.map((s) => serviceSlug(s.name));
