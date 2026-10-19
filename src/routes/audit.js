async function writeAudit(client, {
  userId = null,
  action,
  targetType,
  targetId = null,
  ipAddress = null,
  metadata = {},
}) {
  await client.query(
    `INSERT INTO system_audit_logs
       (user_id, action, target_type, target_id, ip_address, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, action, targetType, targetId, ipAddress, JSON.stringify(metadata)]
  );
}

module.exports = { writeAudit };
