import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableCell } from "@/components/ui/table";
import { Edit, Power, Filter } from "lucide-react";

import { getLocalUser, Infrastructure, SortConfig } from "@/utils";
import TruncatedTextCell from "@/components/_TruncatedTextCell";
import PaginatedTable, {
  PaginatedTableColumn,
} from "@/components/_PaginatedTable";
import { useTranslation } from "react-i18next";

interface InfrastructureListProps {
  infrastructures: Infrastructure[];
  isLoading: boolean;
  onEdit: (infrastructure: Infrastructure) => void;
  onToggleStatus: (id: number, currentStatus: boolean) => Promise<void>;
  onManageQuestions: (infrastructure: Infrastructure) => void;
}

const InfrastructureManagementList: React.FC<InfrastructureListProps> = ({
  infrastructures,
  isLoading,
  onEdit,
  onToggleStatus,
  onManageQuestions,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig<Infrastructure>>({
    key: "name",
    direction: "asc",
  });
  const isAdmin: boolean = getLocalUser()?.role === "admin";
  const { t,i18n } = useTranslation();

  // Filter infrastructures based on search query
  const filteredInfrastructures = infrastructures.filter((infra) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      infra.name.toLowerCase().includes(query) ||
      infra.description?.toLowerCase().includes(query) ||
      (infra.location && infra.location.toLowerCase().includes(query))
    );
  });

  // Define columns for PaginatedTable
  const columns: PaginatedTableColumn<Infrastructure>[] = [
    {
      key: "name",
      header:t('Name'),
      cell: (infra: Infrastructure) => (
        <TableCell className="font-medium text-center">{infra.name}</TableCell>
      ),
      sortable: true,
    },
    {
      key: "description",
      header: t("Description"),
      cell: (infra: Infrastructure) => (
        <TruncatedTextCell
          text={infra.description}
          maxLength={40}
          cellClassName="text-center"
        />
      ),
      sortable: false,
    },
    {
      key: "location",
      header: t('Location'),
      cell: (infra: Infrastructure) => (
        <TableCell className="text-center">{infra.location || "N/A"}</TableCell>
      ),
      sortable: true,
    },
    {
      key: "status",
      header: t("Status"),
      cell: (infra: Infrastructure) => (
        <TableCell className="text-center">
          <span
            className={`px-2 py-1 rounded ${
              infra.is_active
                ? "bg-green-800 text-green-100"
                : "bg-red-800 text-red-100"
            }`}
          >
            {infra.is_active ? t("Active") : t("Inactive")}
          </span>
        </TableCell>
      ),
      sortable: false,
    },
    {
      key: "actions",
      header: t("Actions"),
      cell: (infra: Infrastructure) => (
        <TableCell className="text-center">
          <div className="flex justify-center space-x-2">
            {/* Button to edit infrastructure (admin only) */}
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(infra)}
                className="text-blue-400"
                title="Edit Infrastructure"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}

            {/* Button to manage questions (both admin and managers) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onManageQuestions(infra)}
              className="text-purple-400"
              title="Manage Filter Questions"
            >
              <Filter className="h-4 w-4" />
            </Button>

            {/* Toggle status button (admin only) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleStatus(infra.id, infra.is_active ?? false)}
              className={infra.is_active ? "text-red-400" : "text-green-400"}
              title={infra.is_active ? "Set Inactive" : "Set Active"}
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      ),
      sortable: false,
    },
  ];

  // Handle sort change from PaginatedTable
  const handleSortChange = (newSortConfig: SortConfig<Infrastructure>) => {
    setSortConfig(newSortConfig);
  };

  return (
    <Card className="card1">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          {isAdmin
            ? t("infrastructureManagementList.allInfrastructures")
            : t("infrastructureManagementList.yourManagedInfrastructures")}
        </h2>
        <div className="mb-4">
          <Input
            placeholder={t("common.searchInfrastructures")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {isLoading ? (
          <div className="text-center py-10">{t('common.loadingInfrastructures')}</div>
        ) : (
          <PaginatedTable
            data={filteredInfrastructures}
            columns={columns}
            initialRowsPerPage={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            emptyMessage={t('infrastructureManagementList.noInfrastructuresFound')}
            onSortChange={handleSortChange}
            sortConfig={sortConfig}
            noResults={
              infrastructures.length > 0 ? (
                <div className="text-gray-400">
                 {t('infrastructureManagementList.noInfrastructuresMatchSearch')}
                </div>
              ) : null
            }
          />
        )}
      </CardContent>
    </Card>
  );
};

export default InfrastructureManagementList;
