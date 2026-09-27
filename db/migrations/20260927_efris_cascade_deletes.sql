BEGIN;

-- ---------------------------------------------------------------------------
-- EFRIS tables were created with plain REFERENCES (ON DELETE NO ACTION),
-- which blocked DELETE FROM organizations / branches / products:
--   update or delete on table "organizations" violates foreign key
--   constraint "efris_configurations_organization_id_fkey".
-- Every other organization-scoped FK in this schema is ON DELETE CASCADE.
-- ---------------------------------------------------------------------------

ALTER TABLE efris_configurations DROP CONSTRAINT efris_configurations_organization_id_fkey;
ALTER TABLE efris_configurations ADD CONSTRAINT efris_configurations_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE efris_configurations DROP CONSTRAINT efris_configurations_branch_id_fkey;
ALTER TABLE efris_configurations ADD CONSTRAINT efris_configurations_branch_id_fkey
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE efris_devices DROP CONSTRAINT efris_devices_organization_id_fkey;
ALTER TABLE efris_devices ADD CONSTRAINT efris_devices_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE efris_transactions DROP CONSTRAINT efris_transactions_organization_id_fkey;
ALTER TABLE efris_transactions ADD CONSTRAINT efris_transactions_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE efris_transactions DROP CONSTRAINT efris_transactions_credit_note_parent_id_fkey;
ALTER TABLE efris_transactions ADD CONSTRAINT efris_transactions_credit_note_parent_id_fkey
  FOREIGN KEY (credit_note_parent_id) REFERENCES efris_transactions(id) ON DELETE CASCADE;

ALTER TABLE efris_products DROP CONSTRAINT efris_products_product_id_fkey;
ALTER TABLE efris_products ADD CONSTRAINT efris_products_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- efris_products.organization_id existed without any FK (orphan risk).
ALTER TABLE efris_products ADD CONSTRAINT efris_products_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

COMMIT;
