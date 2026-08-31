/**
 * Rol identifikatorlari — backend `Constants/RoleConstants.cs` bilan bir xil.
 *
 * Ilgari kod bo'ylab `user.roleId === 4` kabi "sehrli raqamlar" tarqoq edi:
 * qaysi raqam qaysi rol ekanini eslab qolish kerak edi va rol qo'shilganda
 * hamma joyni topib chiqish qiyin edi.
 */
export const ROLE = {
    SUPER_ADMIN: 1,
    ADMIN: 2,
    DIRECTOR: 3,
    DOCTOR: 4,
    NURSE: 5,
}

/** Rolning i18n kaliti. */
const ROLE_KEYS = {
    [ROLE.SUPER_ADMIN]: ['role_superadmin', 'SuperAdmin'],
    [ROLE.ADMIN]: ['role_admin', 'Admin'],
    [ROLE.DIRECTOR]: ['role_director', 'Direktor'],
    [ROLE.DOCTOR]: ['role_doctor', 'Shifokor'],
    [ROLE.NURSE]: ['role_nurse', 'Hamshira'],
}

/** Rolning ko'rinadigan nomi (tarjima bilan). */
export function roleName(roleId, t) {
    const entry = ROLE_KEYS[roleId]
    if (!entry) return '—'
    return t ? t(entry[0], { defaultValue: entry[1] }) : entry[1]
}

/** Klinika boshqaruvchisimi (Admin yoki Direktor). */
export const isClinicManager = (roleId) => roleId === ROLE.ADMIN || roleId === ROLE.DIRECTOR

export default { ...ROLE, name: roleName, isClinicManager }
