import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useToast } from "../hooks/use-toast";
import { Loader2, PlusCircle, RefreshCw, Check, AlertTriangle } from "lucide-react";

// ML Training Example interface
interface MlTrainingExample {
  id: number;
  itemId: number | null;
  imageUrl: string | null;
  imageData: string | null;
  productType: string;
  brand: string | null;
  model: string | null;
  condition: string | null;
  marketValue: number | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ML Model Config interface
interface MlModelConfig {
  id: number;
  name: string;
  description: string | null;
  modelId: string | null;
  baseModel: string;
  trainingParams: any | null;
  specialization: string;
  accuracy: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ML Training Session interface
interface MlTrainingSession {
  id: number;
  modelConfigId: number;
  startedAt: string;
  completedAt: string | null;
  status: string;
  trainingExampleCount: number;
  validationExampleCount: number;
  trainingLoss: string | null;
  validationLoss: string | null;
  notes: string | null;
  resultData: any | null;
}

export default function ModelTraining() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("examples");
  const [isExampleDialogOpen, setIsExampleDialogOpen] = useState(false);
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [selectedExamples, setSelectedExamples] = useState<number[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [newExample, setNewExample] = useState({
    productType: "",
    brand: "",
    model: "",
    condition: "",
    marketValue: 0,
    imageUrl: "",
    isVerified: false,
  });
  const [newModelConfig, setNewModelConfig] = useState({
    name: "",
    description: "",
    baseModel: "gpt-4o",
    specialization: "",
    trainingParams: { epochs: 3 },
  });

  // Fetch ML Training Examples
  const {
    data: examples,
    isLoading: isLoadingExamples,
    isError: isErrorExamples,
  } = useQuery({
    queryKey: ["/api/ml/examples"],
    select: (response) => response.data,
  });

  // Fetch ML Model Configs
  const {
    data: models,
    isLoading: isLoadingModels,
    isError: isErrorModels,
  } = useQuery({
    queryKey: ["/api/ml/models"],
    select: (response) => response.data,
  });

  // Fetch ML Training Sessions
  const {
    data: sessions,
    isLoading: isLoadingSessions,
    isError: isErrorSessions,
  } = useQuery({
    queryKey: ["/api/ml/sessions"],
    select: (response) => response.data,
  });

  // Create ML Training Example mutation
  const createExampleMutation = useMutation({
    mutationFn: (example: Partial<MlTrainingExample>) =>
      apiRequest("/api/ml/examples", "POST", example),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ml/examples"] });
      setIsExampleDialogOpen(false);
      toast({
        title: "Success",
        description: "Training example created successfully",
      });
      resetNewExample();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create training example: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Create ML Model Config mutation
  const createModelMutation = useMutation({
    mutationFn: (model: Partial<MlModelConfig>) =>
      apiRequest("/api/ml/models", "POST", model),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ml/models"] });
      setIsModelDialogOpen(false);
      toast({
        title: "Success",
        description: "Model configuration created successfully",
      });
      resetNewModelConfig();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create model configuration: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Set Active Model mutation
  const setActiveModelMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiRequest(`/api/ml/models/${id}/active`, "POST", { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ml/models"] });
      toast({
        title: "Success",
        description: "Model activation status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update model activation status: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Start Fine-tuning mutation
  const startFineTuningMutation = useMutation({
    mutationFn: ({
      modelConfigId,
      exampleIds,
    }: {
      modelConfigId: number;
      exampleIds: number[];
    }) => apiRequest("/api/ml/fine-tune", "POST", { modelConfigId, exampleIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ml/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ml/models"] });
      setIsTrainingDialogOpen(false);
      toast({
        title: "Success",
        description: "Fine-tuning job started successfully",
      });
      setSelectedExamples([]);
      setSelectedModelId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to start fine-tuning job: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Check Fine-tuning Status mutation
  const checkStatusMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiRequest(`/api/ml/fine-tune/${jobId}`, "GET"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ml/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ml/models"] });
      toast({
        title: "Success",
        description: "Fine-tuning status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to check fine-tuning status: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Reset form states
  const resetNewExample = () => {
    setNewExample({
      productType: "",
      brand: "",
      model: "",
      condition: "",
      marketValue: 0,
      imageUrl: "",
      isVerified: false,
    });
  };

  const resetNewModelConfig = () => {
    setNewModelConfig({
      name: "",
      description: "",
      baseModel: "gpt-4o",
      specialization: "",
      trainingParams: { epochs: 3 },
    });
  };

  // Toggle selection of a training example
  const toggleExampleSelection = (id: number) => {
    if (selectedExamples.includes(id)) {
      setSelectedExamples(selectedExamples.filter((exampleId) => exampleId !== id));
    } else {
      setSelectedExamples([...selectedExamples, id]);
    }
  };

  // Handle form submissions
  const handleCreateExample = () => {
    // Convert marketValue from euros to cents
    const marketValueInCents = newExample.marketValue * 100;
    
    const example = {
      ...newExample,
      marketValue: marketValueInCents,
    };
    
    createExampleMutation.mutate(example);
  };

  const handleCreateModel = () => {
    createModelMutation.mutate(newModelConfig);
  };

  const handleStartFineTuning = () => {
    if (selectedModelId && selectedExamples.length > 0) {
      startFineTuningMutation.mutate({
        modelConfigId: selectedModelId,
        exampleIds: selectedExamples,
      });
    } else {
      toast({
        title: "Error",
        description: "Please select a model and at least one training example",
        variant: "destructive",
      });
    }
  };

  const handleCheckStatus = (jobId: string) => {
    checkStatusMutation.mutate(jobId);
  };

  const handleSetActiveModel = (id: number, active: boolean) => {
    setActiveModelMutation.mutate({ id, active });
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Model Training & Analysis</h1>
      <p className="text-muted-foreground mb-8">
        Manage training examples, model configurations, and fine-tuning jobs to improve product analysis.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="examples">Training Examples</TabsTrigger>
          <TabsTrigger value="models">Model Configurations</TabsTrigger>
          <TabsTrigger value="sessions">Training Sessions</TabsTrigger>
        </TabsList>

        {/* Training Examples Tab */}
        <TabsContent value="examples">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Training Examples</h2>
            <div className="flex gap-2">
              {selectedExamples.length > 0 && (
                <Dialog open={isTrainingDialogOpen} onOpenChange={setIsTrainingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      Train Model ({selectedExamples.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Start Model Training</DialogTitle>
                      <DialogDescription>
                        Train a model using the selected examples. Select a model configuration to use.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="mb-4">
                        <Label htmlFor="modelConfig">Model Configuration</Label>
                        <Select
                          onValueChange={(value) => setSelectedModelId(Number(value))}
                        >
                          <SelectTrigger id="modelConfig">
                            <SelectValue placeholder="Select a model configuration" />
                          </SelectTrigger>
                          <SelectContent>
                            {models?.map((model: MlModelConfig) => (
                              <SelectItem key={model.id} value={model.id.toString()}>
                                {model.name} ({model.specialization})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Selected examples: {selectedExamples.length}
                        </p>
                        <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                          <ul className="list-disc list-inside">
                            {selectedExamples.map((id) => {
                              const example = examples?.find(
                                (e: MlTrainingExample) => e.id === id
                              );
                              return (
                                <li key={id} className="text-sm">
                                  {example?.productType} - {example?.brand} {example?.model}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsTrainingDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleStartFineTuning}
                        disabled={!selectedModelId}
                      >
                        {startFineTuningMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                            Starting...
                          </>
                        ) : (
                          "Start Training"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Dialog open={isExampleDialogOpen} onOpenChange={setIsExampleDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Example
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Training Example</DialogTitle>
                    <DialogDescription>
                      Add a new example for training the ML model.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="productType">
                          Product Type (required)
                        </Label>
                        <Input
                          id="productType"
                          value={newExample.productType}
                          onChange={(e) =>
                            setNewExample({
                              ...newExample,
                              productType: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="brand">Brand</Label>
                        <Input
                          id="brand"
                          value={newExample.brand}
                          onChange={(e) =>
                            setNewExample({
                              ...newExample,
                              brand: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          value={newExample.model}
                          onChange={(e) =>
                            setNewExample({
                              ...newExample,
                              model: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="condition">Condition</Label>
                        <Input
                          id="condition"
                          value={newExample.condition}
                          onChange={(e) =>
                            setNewExample({
                              ...newExample,
                              condition: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="marketValue">
                          Market Value (EUR)
                        </Label>
                        <Input
                          id="marketValue"
                          type="number"
                          value={newExample.marketValue}
                          onChange={(e) =>
                            setNewExample({
                              ...newExample,
                              marketValue: parseFloat(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input
                          id="imageUrl"
                          value={newExample.imageUrl}
                          onChange={(e) =>
                            setNewExample({
                              ...newExample,
                              imageUrl: e.target.value,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Provide a URL to the product image or upload an image.
                        </p>
                      </div>
                      <div className="col-span-2 flex items-center space-x-2">
                        <Switch
                          id="isVerified"
                          checked={newExample.isVerified}
                          onCheckedChange={(checked) =>
                            setNewExample({
                              ...newExample,
                              isVerified: checked,
                            })
                          }
                        />
                        <Label htmlFor="isVerified">
                          Verified example (ready for training)
                        </Label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsExampleDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateExample}
                      disabled={!newExample.productType || createExampleMutation.isPending}
                    >
                      {createExampleMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Creating...
                        </>
                      ) : (
                        "Add Example"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {isLoadingExamples ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : isErrorExamples ? (
            <div className="text-center py-8 text-destructive">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load training examples</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Select</TableHead>
                    <TableHead>Product Type</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Market Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examples?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No training examples found. Create your first example to
                        start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    examples?.map((example: MlTrainingExample) => (
                      <TableRow key={example.id}>
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedExamples.includes(example.id)}
                            onChange={() => toggleExampleSelection(example.id)}
                            className="h-4 w-4"
                          />
                        </TableCell>
                        <TableCell>{example.productType}</TableCell>
                        <TableCell>{example.brand || "-"}</TableCell>
                        <TableCell>{example.model || "-"}</TableCell>
                        <TableCell>{example.condition || "-"}</TableCell>
                        <TableCell>
                          {example.marketValue
                            ? `€${(example.marketValue / 100).toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {example.isVerified ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline">Draft</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(example.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Model Configurations Tab */}
        <TabsContent value="models">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Model Configurations</h2>
            <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Model Config
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Model Configuration</DialogTitle>
                  <DialogDescription>
                    Configure a new model for training.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="name">Model Name (required)</Label>
                    <Input
                      id="name"
                      value={newModelConfig.name}
                      onChange={(e) =>
                        setNewModelConfig({
                          ...newModelConfig,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newModelConfig.description}
                      onChange={(e) =>
                        setNewModelConfig({
                          ...newModelConfig,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="baseModel">Base Model</Label>
                    <Select
                      value={newModelConfig.baseModel}
                      onValueChange={(value) =>
                        setNewModelConfig({
                          ...newModelConfig,
                          baseModel: value,
                        })
                      }
                    >
                      <SelectTrigger id="baseModel">
                        <SelectValue placeholder="Select base model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o (Default)</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="specialization">Specialization (required)</Label>
                    <Select
                      value={newModelConfig.specialization}
                      onValueChange={(value) =>
                        setNewModelConfig({
                          ...newModelConfig,
                          specialization: value,
                        })
                      }
                    >
                      <SelectTrigger id="specialization">
                        <SelectValue placeholder="Select specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="fashion">Fashion</SelectItem>
                        <SelectItem value="collectibles">Collectibles</SelectItem>
                        <SelectItem value="musical_instruments">Musical Instruments</SelectItem>
                        <SelectItem value="sporting_goods">Sporting Goods</SelectItem>
                        <SelectItem value="home_goods">Home Goods</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="epochs">Training Epochs</Label>
                    <Input
                      id="epochs"
                      type="number"
                      min={1}
                      max={5}
                      value={newModelConfig.trainingParams.epochs}
                      onChange={(e) =>
                        setNewModelConfig({
                          ...newModelConfig,
                          trainingParams: {
                            ...newModelConfig.trainingParams,
                            epochs: parseInt(e.target.value),
                          },
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Number of epochs to train for (1-5). More epochs may improve
                      accuracy but increase training time and cost.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsModelDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateModel}
                    disabled={
                      !newModelConfig.name ||
                      !newModelConfig.specialization ||
                      createModelMutation.isPending
                    }
                  >
                    {createModelMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Creating...
                      </>
                    ) : (
                      "Add Model Config"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingModels ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : isErrorModels ? (
            <div className="text-center py-8 text-destructive">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load model configurations</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {models?.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-3 text-center py-8 text-muted-foreground">
                  No model configurations found. Create your first config to start.
                </div>
              ) : (
                models?.map((model: MlModelConfig) => (
                  <Card key={model.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{model.name}</CardTitle>
                          <CardDescription>{model.specialization}</CardDescription>
                        </div>
                        <Switch
                          checked={model.isActive}
                          onCheckedChange={(checked) =>
                            handleSetActiveModel(model.id, checked)
                          }
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">Base Model:</span>{" "}
                          <span className="text-sm">{model.baseModel}</span>
                        </div>
                        {model.modelId && (
                          <div>
                            <span className="text-sm font-medium">Trained Model ID:</span>{" "}
                            <span className="text-sm">{model.modelId}</span>
                          </div>
                        )}
                        {model.accuracy !== null && (
                          <div>
                            <span className="text-sm font-medium">Accuracy:</span>{" "}
                            <span className="text-sm">{model.accuracy}%</span>
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium">Status:</span>{" "}
                          {model.isActive ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium">Created:</span>{" "}
                          <span className="text-sm">
                            {new Date(model.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedModelId(model.id);
                          setIsTrainingDialogOpen(true);
                        }}
                      >
                        Train Model
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* Training Sessions Tab */}
        <TabsContent value="sessions">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Training Sessions</h2>
          </div>

          {isLoadingSessions ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : isErrorSessions ? (
            <div className="text-center py-8 text-destructive">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load training sessions</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Model Config</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Examples</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No training sessions found. Start a new training job to begin.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions?.map((session: MlTrainingSession) => {
                      const modelConfig = models?.find(
                        (m: MlModelConfig) => m.id === session.modelConfigId
                      );
                      return (
                        <TableRow key={session.id}>
                          <TableCell>{session.id}</TableCell>
                          <TableCell>
                            {modelConfig ? modelConfig.name : "Unknown Model"}
                          </TableCell>
                          <TableCell>
                            {session.status === "completed" ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                Completed
                              </Badge>
                            ) : session.status === "failed" ? (
                              <Badge variant="destructive">Failed</Badge>
                            ) : session.status === "training" ? (
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                                Training
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(session.startedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {session.completedAt
                              ? new Date(session.completedAt).toLocaleString()
                              : "-"}
                          </TableCell>
                          <TableCell>{session.trainingExampleCount}</TableCell>
                          <TableCell>
                            {(session.status === "training" ||
                              session.status === "pending") &&
                              session.resultData?.fineTuningJob?.id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleCheckStatus(
                                      session.resultData.fineTuningJob.id
                                    )
                                  }
                                  disabled={checkStatusMutation.isPending}
                                >
                                  {checkStatusMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}