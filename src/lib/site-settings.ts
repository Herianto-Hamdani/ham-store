import { cache } from "react";

import type { SiteSetting } from "@prisma/client";

import { APP_NAME, DEFAULT_WHATSAPP_MESSAGE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const defaultSiteSettingValues = {
  id: 1,
  webName: APP_NAME,
  whatsappNumber: "",
  whatsappMessage: DEFAULT_WHATSAPP_MESSAGE,
  logoPath: null,
  logoThumbPath: null,
  bannerPath: null,
  bannerThumbPath: null,
  templateBgPath: null,
  templateBgThumbPath: null,
  templateLogoPath: null,
  templateLogoThumbPath: null,
  templateBgPosX: 50,
  templateBgPosY: 50,
  templateBgScale: 100,
  templateLogoTop: 4,
  templateLogoRight: 4,
  templateLogoWidth: 32,
  templateTitleLeft: 10,
  templateTitleWidth: 80,
  templateTitleBottom: 2,
  templateTitleFont: 14,
  templateSideTop: 22,
  templateSideLeft: 3,
  templateSideRight: 3,
  templateSideFont: 12,
  templatePhotoTop: 18,
  templatePhotoLeft: 15,
  templatePhotoWidth: 70,
  templatePhotoHeight: 58
} satisfies Omit<SiteSetting, "createdAt" | "updatedAt">;

export const getSiteSettings = cache(async (): Promise<SiteSetting> => {
  return prisma.siteSetting.upsert({
    where: { id: 1 },
    update: {},
    create: defaultSiteSettingValues
  });
});
