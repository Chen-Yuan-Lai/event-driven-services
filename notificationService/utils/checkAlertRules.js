import format from 'pg-format';

export const getAlertRule = async (client, ruleId) => {
  const query = {
    text: `SELECT filter, action_interval FROM alert_rules WHERE id = $1 AND delete = false`,
    values: [ruleId],
  };
  const res = await client.query(query);

  return res.rows[0];
};

export const getTriggers = async (client, ruleId) => {
  const query = {
    text: `SELECT * FROM triggers WHERE rule_id = $1 AND delete = false`,
    values: [ruleId],
  };
  const res = await client.query(query);

  return res.rows;
};

export const getTokens = async (client, ruleId) => {
  const query = {
    text: `SELECT token FROM channels WHERE rule_id = $1 AND delete = false`,
    values: [ruleId],
  };
  const res = await client.query(query);
  const tokens = res.rows.map(el => el.token);
  return tokens;
};

export const getIssues = async (client, projectId, interval = null) => {
  let queryText = `
    SELECT 
      COUNT(DISTINCT(e.fingerprints)) AS issues_num,
      COUNT(DISTINCT(r.ip)) AS users_num
    FROM 
      events AS e
    LEFT JOIN
      request_info AS r ON r.event_id = e.id
    WHERE 
      e.project_id = $1
      AND e.delete = false
      AND e.status = 'unhandled'
  `;

  const values = [projectId];

  if (interval) {
    queryText += ` AND e.created_at >= NOW() - INTERVAL $2`;
    values.push(interval);
  }

  const query = {
    text: queryText,
    values: values,
  };

  const res = await client.query(query);
  return res.rows[0];
};

export const createAlertHistory = async (client, ruleId) => {
  const query = {
    text: `INSERT INTO alert_histories(rule_id) VALUES($1) RETURNING *`,
    values: [ruleId],
  };
  const res = await client.query(query);

  return res.rows[0];
};
