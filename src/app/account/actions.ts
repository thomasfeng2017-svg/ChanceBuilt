"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  authenticateCustomer,
  changePassword,
  createCustomerSession,
  destroyCustomerSession,
  registerCustomer,
  requestPasswordReset,
  requireCustomerAction,
  resetPassword,
  RESET_TOKEN_MINUTES,
} from "@/lib/customer-auth";
import { sendPasswordReset } from "@/lib/email";
import { baseUrl } from "@/lib/stripe";
import { toCookieVehicle } from "@/lib/customer-garage";
import { GARAGE_COOKIE, GARAGE_MAX_AGE, GARAGE_BAR_COOKIE } from "@/lib/vehicle";

export type AuthState = { ok: false; error: string } | null;

// ------------------------------------------------------------ sign in / up --

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/account");

  const result = await authenticateCustomer(email, password);
  if (!result.ok) return { ok: false, error: result.error };

  const ua = (await headers()).get("user-agent") ?? undefined;
  await createCustomerSession(result.customer.id, ua);

  revalidatePath("/", "layout");
  // Only ever redirect within this site. `next` arrives from a query string, so
  // without this an emailed link could bounce someone straight off to another
  // host carrying the trust of having just signed in.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/account");
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const result = await registerCustomer({
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    password: String(formData.get("password") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });

  if (!result.ok) return { ok: false, error: result.error };

  const ua = (await headers()).get("user-agent") ?? undefined;
  await createCustomerSession(result.customer.id, ua);

  revalidatePath("/", "layout");
  redirect("/account?welcome=1");
}

export async function logoutAction() {
  await destroyCustomerSession();
  revalidatePath("/", "layout");
  redirect("/");
}

// -------------------------------------------------------- password resets --

export type NoticeState = { ok: boolean; message: string } | null;

/**
 * Always reports the same thing, whether or not the address has an account.
 * Saying "no account found" would turn this form into a way of finding out who
 * shops here.
 */
export async function requestResetAction(
  _prev: NoticeState,
  formData: FormData,
): Promise<NoticeState> {
  const email = String(formData.get("email") ?? "");

  await requestPasswordReset(
    email,
    (to, name, url) => sendPasswordReset(to, name, url, RESET_TOKEN_MINUTES),
    baseUrl(),
  );

  return {
    ok: true,
    message:
      "If there's an account with that address, a reset link is on its way. It expires in an hour.",
  };
}

export async function resetPasswordAction(
  _prev: NoticeState,
  formData: FormData,
): Promise<NoticeState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password !== confirm) {
    return { ok: false, message: "Those two passwords don't match." };
  }

  const result = await resetPassword(token, password);
  if (!result.ok) return { ok: false, message: result.error };

  // Deliberately not signed in here. Resetting destroys every session,
  // including any an intruder held, and making them type the new password once
  // proves it is the one they meant.
  redirect("/account/login?reset=1");
}

export async function changePasswordAction(
  _prev: NoticeState,
  formData: FormData,
): Promise<NoticeState> {
  const customer = await requireCustomerAction();

  const next = String(formData.get("password") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) {
    return { ok: false, message: "Those two passwords don't match." };
  }

  const result = await changePassword(
    customer.id,
    String(formData.get("current") ?? ""),
    next,
  );
  if (!result.ok) return { ok: false, message: result.error };

  // Every session went, including this one, so send them back to sign in.
  revalidatePath("/", "layout");
  redirect("/account/login?changed=1");
}

// ----------------------------------------------------------------- garage --

/** Write a saved car into the garage cookie, so fitment filters by it. */
async function selectCookie(vehicle: ReturnType<typeof toCookieVehicle>) {
  if (!vehicle) return;
  const jar = await cookies();
  jar.set(GARAGE_COOKIE, JSON.stringify(vehicle), {
    maxAge: GARAGE_MAX_AGE,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  jar.delete(GARAGE_BAR_COOKIE);
}

export async function addVehicleAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const customer = await requireCustomerAction();

  const modelId = String(formData.get("modelId") ?? "");
  const year = Number(formData.get("year"));
  const nickname = String(formData.get("nickname") ?? "").trim();

  if (!modelId || !Number.isInteger(year)) {
    return { ok: false, error: "Pick a year, make and model." };
  }

  // Re-checked against the catalog rather than trusted: these ids come from a
  // form, and a bogus pair would otherwise be stored as a real car forever.
  const model = await prisma.model.findUnique({ where: { id: modelId }, include: { make: true } });
  if (!model) return { ok: false, error: "That vehicle isn't in our catalog." };
  if (year < model.yearStart || year > model.yearEnd) {
    return { ok: false, error: `We don't list a ${year} ${model.make.name} ${model.name}.` };
  }

  const existing = await prisma.garageVehicle.findFirst({
    where: { customerId: customer.id, modelId, year },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, error: "That car is already in your garage." };
  }

  const vehicle = await prisma.garageVehicle.create({
    data: {
      customerId: customer.id,
      year,
      makeName: model.make.name,
      modelName: model.name,
      chassis: model.chassis,
      modelId: model.id,
      nickname: nickname || null,
    },
  });

  await selectCookie(toCookieVehicle(vehicle));
  revalidatePath("/", "layout");
  redirect(`/account/garage/${vehicle.id}`);
}

/**
 * Make this the car the catalog filters by, then go to the catalog.
 *
 * The navigation is the point. This used to set the cookie and refresh in
 * place, which left you looking at the same build sheet: a control labelled
 * "Shop for this car" with an arrow on it had no visible effect at all, and on
 * a car that was already selected it had no effect whatsoever, since the cookie
 * write changed nothing either.
 */
export async function selectVehicleAction(vehicleId: string) {
  const customer = await requireCustomerAction();
  const vehicle = await prisma.garageVehicle.findFirst({
    where: { id: vehicleId, customerId: customer.id },
  });
  if (!vehicle) throw new Error("That car isn't in your garage.");

  await selectCookie(toCookieVehicle(vehicle));
  revalidatePath("/", "layout");
  redirect("/parts");
}

export async function updateVehicleAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const customer = await requireCustomerAction();
  const id = String(formData.get("id") ?? "");

  // The scoping is in the where clause. updateMany rather than update so a
  // vehicle belonging to someone else simply matches nothing.
  const { count } = await prisma.garageVehicle.updateMany({
    where: { id, customerId: customer.id },
    data: {
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });
  if (count === 0) return { ok: false, error: "That car isn't in your garage." };

  revalidatePath(`/account/garage/${id}`);
  revalidatePath("/account");
  return null;
}

export async function removeVehicleAction(vehicleId: string) {
  const customer = await requireCustomerAction();
  await prisma.garageVehicle.deleteMany({ where: { id: vehicleId, customerId: customer.id } });
  revalidatePath("/account");
  redirect("/account");
}

// -------------------------------------------------------------------- mods --

/** Confirm a car belongs to the caller, and return its id. Throws if not. */
async function ownedVehicleId(customerId: string, vehicleId: string): Promise<string> {
  const vehicle = await prisma.garageVehicle.findFirst({
    where: { id: vehicleId, customerId },
    select: { id: true },
  });
  if (!vehicle) throw new Error("That car isn't in your garage.");
  return vehicle.id;
}

export async function addModAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const customer = await requireCustomerAction();
  const vehicleId = String(formData.get("vehicleId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2) return { ok: false, error: "Give the mod a name." };
  await ownedVehicleId(customer.id, vehicleId);

  const installedRaw = String(formData.get("installedAt") ?? "").trim();
  const installedAt = installedRaw ? new Date(installedRaw) : null;

  await prisma.mod.create({
    data: {
      vehicleId,
      name,
      category: String(formData.get("category") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      installedAt: installedAt && !Number.isNaN(installedAt.getTime()) ? installedAt : null,
      source: "OWNER",
    },
  });

  revalidatePath(`/account/garage/${vehicleId}`);
  return null;
}

export async function removeModAction(modId: string, vehicleId: string) {
  const customer = await requireCustomerAction();
  await ownedVehicleId(customer.id, vehicleId);
  // Scoped by vehicle as well as id, so a mod id from another car is a no-op.
  await prisma.mod.deleteMany({ where: { id: modId, vehicleId } });
  revalidatePath(`/account/garage/${vehicleId}`);
}

/**
 * Add a part already bought from the shop to a build sheet.
 *
 * The order item is the evidence, so these land as PURCHASED rather than
 * OWNER: the shop can then tell "we sold them this" from "they told us this".
 */
export async function addPurchasedModAction(input: {
  vehicleId: string;
  orderId: string;
  productId: string;
}) {
  const customer = await requireCustomerAction();
  await ownedVehicleId(customer.id, input.vehicleId);

  // The order has to be the customer's own and actually paid for. Without this
  // check a crafted form could pin any product in the catalog to a build sheet
  // and have it read as a verified purchase.
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, customerId: customer.id, status: { in: ["PAID", "SHIPPED"] } },
    include: { items: true },
  });
  if (!order) throw new Error("That order isn't yours.");

  const item = order.items.find((i) => i.productId === input.productId);
  if (!item) throw new Error("That part isn't on the order.");

  const already = await prisma.mod.findFirst({
    where: { vehicleId: input.vehicleId, productId: input.productId },
    select: { id: true },
  });
  if (already) return;

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { category: { include: { parent: true } } },
  });

  await prisma.mod.create({
    data: {
      vehicleId: input.vehicleId,
      name: item.name,
      category: product?.category.parent?.name ?? product?.category.name ?? null,
      installedAt: order.paidAt ?? order.createdAt,
      source: "PURCHASED",
      productId: input.productId,
      orderId: order.id,
    },
  });

  revalidatePath(`/account/garage/${input.vehicleId}`);
}
