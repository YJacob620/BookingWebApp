import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

import { Infrastructure, fetchInfrastructures } from '@/utils';

interface InfrastructureSelectorProps {
  onSelectInfrastructure: (infrastructureId: number, infrastructure: Infrastructure) => void;
  onError: (message: string) => void;
}

const InfrastructureSelector: React.FC<InfrastructureSelectorProps> = ({
  onSelectInfrastructure,
  onError
}) => {
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [selectedInfraId, setSelectedInfraId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getInfrastructures();
  }, []);

  // When selected infrastructure changes, notify parent component
  useEffect(() => {
    if (selectedInfraId) {
      const selectedInfra = infrastructures.find(i => i.id === selectedInfraId);
      if (selectedInfra) {
        onSelectInfrastructure(selectedInfraId, selectedInfra);
      }
    }
  }, [selectedInfraId, infrastructures, onSelectInfrastructure]);

  const getInfrastructures = async () => {
    try {
      setIsLoading(true);

      // Replace direct fetch with the imported utility function
      const data = await fetchInfrastructures();
      setInfrastructures(data);

      if (data.length > 0) {
        setSelectedInfraId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching infrastructures:', error);
      onError('Failed to fetch infrastructures');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading infrastructures...</div>;
  }

  if (infrastructures.length === 0) {
    return (
      <div className="text-center py-4 text-amber-500">
        No infrastructures available. Please create an infrastructure first.
      </div>
    );
  }

  // Find the selected infrastructure to display its name
  const selectedInfrastructure = infrastructures.find(infra => infra.id === selectedInfraId);

  return (
    <div className="mb-6">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="infrastructure-selector"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[calc(100%-5rem)] h-10 cursor-pointer card2"
          >
            {selectedInfrastructure ? selectedInfrastructure.name : "Select an infrastructure..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 card1 min-w-80">
          <Command>
            <CommandInput placeholder="Search infrastructure..." className="border-none focus:ring-0 !bg-transparent px-1" />
            <CommandList>
              <CommandEmpty>No infrastructure found.</CommandEmpty>
              <CommandGroup>
                {infrastructures.map(infra => (
                  <CommandItem
                    key={infra.id}
                    value={infra.name}
                    onSelect={() => {
                      setSelectedInfraId(infra.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer def-hover justify-center"
                  >
                    <span>{infra.name}</span>
                    {infra.location && <span className="text-gray-400 ml-2">({infra.location})</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default InfrastructureSelector;