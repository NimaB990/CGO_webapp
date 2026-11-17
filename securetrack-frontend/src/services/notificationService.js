import api from '../api';

/** Backend notification mapped to the fields used by the inbox. */
export function notificationFromJson(value) {
  if (!value || !Number.isSafeInteger(value.id)) throw new Error('Invalid notification');
  return {
    id: value.id,
    title: typeof value.title === 'string' ? value.title : 'Notification',
    message: typeof value.message === 'string' ? value.message : '',
    createdAt: value.createdAt && !Number.isNaN(Date.parse(value.createdAt)) ? value.createdAt : null,
    read: value.read === true,
  };
}

export async function getNotifications() {
  const { data } = await api.get('/api/notifications', { skipAuthRedirect: true });
  const notifications = Array.isArray(data)
    ? data
    : data?.data ?? data?.notifications ?? data?.content
      ?? data?.result?.data ?? data?.result?.content;
  if (!Array.isArray(notifications)) throw new Error('Invalid notifications response');
  return [...new Map(notifications.map(notification => {
    const mapped = notificationFromJson(notification);
    return [mapped.id, mapped];
  })).values()];
}

export async function markNotificationAsRead(id) {
  await api.put('/api/notifications/' + encodeURIComponent(id) + '/read', {}, { skipAuthRedirect: true });
}
