import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Spinner from "../components/ui/Spinner";
import { getRolePermissions, updateRolePermissions } from "../services/permissionService";

const ROLES = ["manager", "cashier"];
const MODULE_LABELS = { sales:"Sales", stock:"Stock", customers:"Customers", payments:"Payments", expenses:"Expenses", salary:"Salary", reports:"Reports", categories:"Categories", items:"Items", branches:"Branches" };
const ACTION_LABELS = { view:"View", create:"Create", edit:"Edit", deactivate:"Deactivate", addPurchase:"Add purchase", record:"Record", viewLedger:"View ledger", dashboard:"Dashboard", profitLoss:"Profit & loss", lowStock:"Low stock" };

function RoleCard({ role, permissions, catalog, custom, onToggle }) {
  const [openModules, setOpenModules] = useState(() => new Set());
  const toggleModule = (module) => setOpenModules((current) => {
    const next = new Set(current);
    if (next.has(module)) next.delete(module);
    else next.add(module);
    return next;
  });
  const enabledCount = Object.entries(catalog).reduce((total, [module, actions]) => total + actions.filter((action) => permissions?.[module]?.[action]).length, 0);
  const totalCount = Object.values(catalog).reduce((total, actions) => total + actions.length, 0);
  return <section className="card overflow-hidden">
    <div className="px-5 py-4 bg-gradient-to-r from-primary-50 to-white border-b border-primary-100 flex items-center justify-between gap-3">
      <div><h2 className="text-base font-bold text-gray-900 capitalize">{role}</h2><p className="mt-0.5 text-xs text-gray-500">{custom ? "Custom organization defaults" : "Built-in system defaults"}</p></div>
      <span className="shrink-0 rounded-full bg-white border border-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">{enabledCount}/{totalCount} enabled</span>
    </div>
    <div className="divide-y divide-gray-100">{Object.entries(catalog).map(([module, actions]) => {
      const isOpen = openModules.has(module);
      const enabled = actions.filter((action) => permissions?.[module]?.[action]).length;
      return <div key={module}>
        <button type="button" onClick={() => toggleModule(module)} aria-expanded={isOpen} className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
          <span className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={isOpen ? "M5 9l7 7 7-7" : "M9 5l7 7-7 7"} /></svg><span className="text-sm font-semibold text-gray-800">{MODULE_LABELS[module]}</span></span>
          <span className="text-xs text-gray-500">{enabled}/{actions.length}</span>
        </button>
        {isOpen && <div className="px-5 pb-4 grid grid-cols-2 gap-x-4 gap-y-2.5">{actions.map((action) => <label key={action} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-gray-700 cursor-pointer hover:bg-primary-50"><input type="checkbox" checked={Boolean(permissions?.[module]?.[action])} onChange={() => onToggle(role, module, action)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />{ACTION_LABELS[action]}</label>)}</div>}
      </div>;
    })}</div>
  </section>;
}

export default function Permissions() {
  const [rolePermissions, setRolePermissions] = useState({ manager: {}, cashier: {} });
  const [catalog, setCatalog] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customRoles, setCustomRoles] = useState({});
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(ROLES.map((role) => getRolePermissions(role)));
      setRolePermissions({ manager: results[0].data.data.permissions, cashier: results[1].data.data.permissions });
      setCatalog(results[0].data.data.catalog);
      setCustomRoles({ manager: results[0].data.data.hasCustomDefault, cashier: results[1].data.data.hasCustomDefault });
    } catch (err) { toast.error(err.response?.data?.message || "Failed to load role permissions"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const toggle = (role, module, action) => setRolePermissions((current) => ({ ...current, [role]: { ...current[role], [module]: { ...current[role]?.[module], [action]: !current[role]?.[module]?.[action] } } }));
  const save = async () => {
    setSaving(true);
    try { await Promise.all(ROLES.map((role) => updateRolePermissions(role, rolePermissions[role]))); setCustomRoles({ manager: true, cashier: true }); toast.success("Role defaults saved"); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to save permissions"); }
    finally { setSaving(false); }
  };
  return <div className="w-full max-w-6xl">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"><div><h1 className="text-2xl font-bold text-gray-900">Role Permissions</h1><p className="text-sm text-gray-500 mt-1">Set default access for new managers and cashiers. Individual users can have custom overrides.</p></div><button className="btn-primary shrink-0" onClick={save} disabled={loading || saving}>{saving && <Spinner size="sm" className="mr-2" />}Save defaults</button></div>
    {loading ? <div className="card flex justify-center py-20"><Spinner size="lg" className="text-primary-600" /></div> : <div className="grid grid-cols-1 md:grid-cols-2 items-start" style={{ columnGap: "32px", rowGap: "20px" }}><RoleCard role="manager" permissions={rolePermissions.manager} catalog={catalog} custom={customRoles.manager} onToggle={toggle} /><RoleCard role="cashier" permissions={rolePermissions.cashier} catalog={catalog} custom={customRoles.cashier} onToggle={toggle} /></div>}
  </div>;
}
